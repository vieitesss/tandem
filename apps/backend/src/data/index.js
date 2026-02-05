const path = require("path");
const { mkdir, readFile, readdir, stat, writeFile, unlink } = require("fs/promises");
const { createClient } = require("@supabase/supabase-js");

const { createSupabaseAdapter } = require("./supabaseAdapter");
const { createPgliteAdapter } = require("./pgliteAdapter");
const { resolveSnapshotPath } = require("../snapshot");
const { normalizeDataDir } = require("../utils/paths");

const ensureDataDir = async (dataDir) => {
  if (!dataDir) {
    return null;
  }

  const resolvedPath = path.resolve(process.cwd(), dataDir);
  await mkdir(resolvedPath, { recursive: true });
  return resolvedPath;
};

const hasDataDirContents = async (dataDir) => {
  if (!dataDir) {
    return false;
  }

  try {
    const stats = await stat(dataDir);
    if (!stats.isDirectory()) {
      return false;
    }

    const entries = await readdir(dataDir);
    return entries.length > 0;
  } catch (error) {
    return false;
  }
};

const loadSnapshotBlob = async (snapshotPath) => {
  try {
    const snapshotBuffer = await readFile(snapshotPath);
    console.log(`Loaded PGlite snapshot from ${snapshotPath}`);
    return new Blob([snapshotBuffer]);
  } catch (error) {
    if (error.code === "ENOENT") {
      console.log(`No snapshot file found at ${snapshotPath}`);
    } else {
      console.warn(`Failed to load snapshot from ${snapshotPath}:`, error.message);
    }
    return null;
  }
};

const loadPGlite = async () => {
  const module = await import("@electric-sql/pglite");
  return module.PGlite;
};

const loadSchema = async (pg) => {
  const schemaPath = path.join(__dirname, "..", "..", "sql", "schema.sql");
  const schemaSql = await readFile(schemaPath, "utf8");
  await pg.exec(schemaSql);
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getEnvNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const getLinuxProcessStartTime = async (pid) => {
  if (process.platform !== "linux") {
    return null;
  }

  try {
    const stat = await readFile(`/proc/${pid}/stat`, "utf8");
    const closeIndex = stat.lastIndexOf(")");
    if (closeIndex === -1) {
      return null;
    }
    const after = stat.slice(closeIndex + 2);
    const parts = after.split(" ");
    const startTime = Number(parts[19]);
    return Number.isFinite(startTime) ? startTime : null;
  } catch (error) {
    return null;
  }
};

const acquireLock = async (dataDir) => {
  const absoluteDataDir = path.isAbsolute(dataDir)
    ? dataDir
    : path.resolve(process.cwd(), dataDir);

  // Store lock file outside PGlite data dir to avoid conflicts.
  // If the data dir is at the filesystem root, fall back to the data dir itself.
  const parentDir = path.dirname(absoluteDataDir);
  const lockDir =
    parentDir === path.parse(absoluteDataDir).root ? absoluteDataDir : parentDir;
  const lockPath = path.join(lockDir, ".tandem.lock");
  const processStartMs = Date.now() - process.uptime() * 1000;
  const processStartTicks = await getLinuxProcessStartTime(process.pid);
  const lockInfo = {
    pid: process.pid,
    timestamp: new Date().toISOString(),
    started_at: new Date().toISOString(),
    start_time_ticks: processStartTicks,
  };

  const waitMs = getEnvNumber(process.env.PGLITE_LOCK_WAIT_MS, 20000);
  const delayMs = getEnvNumber(process.env.PGLITE_LOCK_RETRY_DELAY_MS, 500);
  const deadline = Date.now() + waitMs;

  while (true) {
    try {
      await writeFile(lockPath, JSON.stringify(lockInfo, null, 2), { flag: "wx" });
      break;
    } catch (error) {
      if (error.code !== "EEXIST") {
        throw error;
      }

      let existing = null;
      try {
        const existingLock = await readFile(lockPath, "utf8");
        existing = JSON.parse(existingLock);
      } catch (readError) {
        if (readError.code !== "ENOENT") {
          console.warn("Failed to read lock file, retrying:", readError.message);
        }
      }

      const existingPid = Number(existing?.pid);
      const existingTimestamp = existing?.started_at || existing?.timestamp;
      const existingStartTicks = Number(existing?.start_time_ticks);
      let lockActive = false;

      if (Number.isFinite(existingPid) && existingPid > 0) {
        const currentStartTicks = await getLinuxProcessStartTime(existingPid);
        if (
          Number.isFinite(existingStartTicks) &&
          Number.isFinite(currentStartTicks)
        ) {
          lockActive = existingStartTicks === currentStartTicks;
        } else {
          try {
            process.kill(existingPid, 0);
            lockActive = true;
          } catch (killError) {
            if (killError.code !== "ESRCH") {
              throw killError;
            }
          }
        }
      }

      if (lockActive && existingPid === process.pid && existingTimestamp) {
        const existingStartMs = Date.parse(existingTimestamp);
        if (
          Number.isFinite(existingStartMs) &&
          existingStartMs < processStartMs - 1000
        ) {
          lockActive = false;
        }
      }

      if (!lockActive) {
        console.warn(
          `Removing stale lock file from process ${existingPid || "unknown"}`
        );
        try {
          await unlink(lockPath);
        } catch (unlinkError) {
          if (unlinkError.code !== "ENOENT") {
            throw unlinkError;
          }
        }
        continue;
      }

      if (Date.now() >= deadline) {
        throw new Error(
          `PGlite database at ${dataDir} is already in use by process ${existingPid} (started ${existingTimestamp || "unknown"}). ` +
            `PGlite does not support concurrent access. Stop the other process or use a different data directory.`
        );
      }

      console.warn(
        `PGlite lock active for process ${existingPid} (started ${existingTimestamp || "unknown"}). ` +
          `Retrying in ${delayMs}ms...`
      );
      await sleep(delayMs);
    }
  }

  // Return cleanup function
  return async () => {
    try {
      await unlink(lockPath);
    } catch (error) {
      if (error.code !== "ENOENT") {
        console.warn("Failed to remove lock file:", error.message);
      }
    }
  };
};

const createDataAdapter = async ({ emitChange } = {}) => {
  const pgliteDataDir = String(process.env.PGLITE_DATA_DIR || "").trim();
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (pgliteDataDir && supabaseUrl && supabaseKey) {
    console.warn(
      "Both PGlite and Supabase credentials are configured. Using PGlite (local mode)."
    );
  }

  if (pgliteDataDir) {
    const PGlite = await loadPGlite();
    const normalizedDataDir = normalizeDataDir(pgliteDataDir);
    const resolvedDataDir = await ensureDataDir(normalizedDataDir);

    // Acquire lock to prevent concurrent access
    const releaseLock = await acquireLock(resolvedDataDir);

    // Set up cleanup on exit
    const cleanup = async () => {
      await releaseLock();
      process.exit(0);
    };

    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);
    process.on("exit", releaseLock);

    const hasExistingData = await hasDataDirContents(resolvedDataDir);
    const snapshotPath = String(process.env.PGLITE_SNAPSHOT_PATH || "").trim();
    const resolvedSnapshotPath = snapshotPath || resolveSnapshotPath(pgliteDataDir);
    const snapshotBlob = hasExistingData
      ? null
      : await loadSnapshotBlob(resolvedSnapshotPath);
    const pgOptions = snapshotBlob ? { loadDataDir: snapshotBlob } : undefined;

    const pg = await PGlite.create(resolvedDataDir, pgOptions);
    if (!hasExistingData) {
      if (!snapshotBlob) {
        console.log("Starting with empty PGlite database (no existing data or snapshot)");
      }
      await loadSchema(pg);
    } else {
      console.log(`Using existing PGlite database at ${resolvedDataDir}`);
    }
    return {
      adapter: createPgliteAdapter({ pg, emitChange }),
      mode: "local",
      pg,
    };
  }

  if (supabaseUrl && supabaseKey) {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });
    return {
      adapter: createSupabaseAdapter({ supabase, emitChange }),
      mode: "cloud",
      pg: null,
    };
  }

  throw new Error(
    "Missing database configuration: set PGLITE_DATA_DIR or Supabase credentials."
  );
};

module.exports = { createDataAdapter };
