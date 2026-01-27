const path = require("path");
const { mkdir, readFile, readdir, stat } = require("fs/promises");
const { createClient } = require("@supabase/supabase-js");

const { createSupabaseAdapter } = require("./supabaseAdapter");
const { createPgliteAdapter } = require("./pgliteAdapter");
const { resolveSnapshotPath } = require("../snapshot");

const normalizeDataDir = (dataDir) => {
  if (!dataDir) {
    return "";
  }

  return String(dataDir).startsWith("file://")
    ? String(dataDir).replace("file://", "")
    : String(dataDir);
};

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
    return new Blob([snapshotBuffer]);
  } catch (error) {
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

const createDataAdapter = async ({ emitChange } = {}) => {
  const pgliteDataDir = String(process.env.PGLITE_DATA_DIR || "").trim();
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (pgliteDataDir) {
    const PGlite = await loadPGlite();
    const normalizedDataDir = normalizeDataDir(pgliteDataDir);
    const resolvedDataDir = await ensureDataDir(normalizedDataDir);
    const hasExistingData = await hasDataDirContents(resolvedDataDir);
    const snapshotPath = String(process.env.PGLITE_SNAPSHOT_PATH || "").trim();
    const resolvedSnapshotPath = snapshotPath || resolveSnapshotPath(pgliteDataDir);
    const snapshotBlob = hasExistingData
      ? null
      : await loadSnapshotBlob(resolvedSnapshotPath);
    const pgOptions = snapshotBlob ? { loadDataDir: snapshotBlob } : undefined;

    const pg = await PGlite.create(pgliteDataDir, pgOptions);
    if (!hasExistingData) {
      await loadSchema(pg);
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
