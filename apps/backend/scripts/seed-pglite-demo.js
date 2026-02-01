const path = require("path");
const { mkdir, readFile } = require("fs/promises");
const { resolveDataDir } = require("../src/utils/paths");

const ensureDataDir = async (dataDir) => {
  if (!dataDir) {
    return null;
  }

  await mkdir(dataDir, { recursive: true });
  return dataDir;
};

const loadPglite = async () => {
  const module = await import("@electric-sql/pglite");
  return module.PGlite;
};

const loadSql = async (filename) => {
  const sqlPath = path.join(__dirname, "..", "sql", filename);
  return readFile(sqlPath, "utf8");
};

const run = async () => {
  const pgliteDataDir = process.env.PGLITE_DATA_DIR;

  if (!pgliteDataDir) {
    throw new Error("Missing PGLITE_DATA_DIR in the environment.");
  }

  const repoRoot = path.resolve(__dirname, "..", "..", "..");
  const resolvedDataDir = resolveDataDir(pgliteDataDir, repoRoot);
  await ensureDataDir(resolvedDataDir);

  const PGlite = await loadPglite();
  const pg = await PGlite.create(resolvedDataDir);

  const schemaSql = await loadSql("schema.sql");
  const seedSql = await loadSql("seed_demo.sql");

  await pg.exec(schemaSql);
  await pg.exec(seedSql);

  console.log("PGlite demo seed complete.");
};

run().catch((error) => {
  console.error("Demo seed failed:", error.message || error);
  process.exit(1);
});
