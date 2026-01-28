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

const acquireLock = async (dataDir) => {
  const lockPath = path.join(dataDir, ".pglite.lock");
  const lockInfo = {
    pid: process.pid,
    timestamp: new Date().toISOString(),
  };

  try {
    // Try to read existing lock file
    const existingLock = await readFile(lockPath, "utf8");
    const existing = JSON.parse(existingLock);

    // Check if process is still running (Unix-only; may not work reliably on Windows)
    try {
      process.kill(existing.pid, 0); // On Unix, signal 0 checks if process exists
      throw new Error(
        `PGlite database at ${dataDir} is already in use by process ${existing.pid} (started ${existing.timestamp}). ` +
          `PGlite does not support concurrent access. Stop the other process or use a different data directory.`
      );
    } catch (error) {
      if (error.code === "ESRCH") {
        // Process doesn't exist, stale lock file
        console.warn(`Removing stale lock file from process ${existing.pid}`);
      } else {
        throw error;
      }
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
    // No lock file exists, proceed
  }

  // Create lock file
  await writeFile(lockPath, JSON.stringify(lockInfo, null, 2));

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
