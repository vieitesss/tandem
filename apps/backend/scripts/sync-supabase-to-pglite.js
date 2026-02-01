const path = require("path");
const { mkdir, readFile, readdir, stat } = require("fs/promises");
const { createClient } = require("@supabase/supabase-js");
const { resolveDataDir } = require("../src/utils/paths");

const PAGE_SIZE = 1000;
const INSERT_CHUNK_SIZE = 500;

const TABLES = [
  {
    name: "profiles",
    columns: ["id", "display_name", "default_split", "created_at"],
    conflictTarget: "id",
    updateColumns: ["display_name", "default_split", "created_at"],
    orderBy: "id",
  },
  {
    name: "categories",
    columns: ["id", "label", "icon", "is_default", "created_at"],
    conflictTarget: "label",
    updateColumns: ["icon", "is_default", "created_at"],
    orderBy: "id",
  },
  {
    name: "transactions",
    columns: [
      "id",
      "payer_id",
      "beneficiary_id",
      "split_mode",
      "amount",
      "category",
      "date",
      "note",
      "type",
      "created_at",
    ],
    conflictTarget: "id",
    updateColumns: [
      "payer_id",
      "beneficiary_id",
      "split_mode",
      "amount",
      "category",
      "date",
      "note",
      "type",
      "created_at",
    ],
    orderBy: "id",
  },
  {
    name: "transaction_splits",
    columns: ["id", "transaction_id", "user_id", "amount"],
    conflictTarget: "id",
    updateColumns: ["transaction_id", "user_id", "amount"],
    orderBy: "id",
  },
];



const ensureDataDir = async (dataDir) => {
  if (!dataDir) {
    return null;
  }

  await mkdir(dataDir, { recursive: true });
  return dataDir;
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

const loadEnvFile = async (envPath) => {
  try {
    const contents = await readFile(envPath, "utf8");
    contents.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        return;
      }

      const match = trimmed.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/i);
      if (!match) {
        return;
      }

      const key = match[1];
      if (process.env[key]) {
        return;
      }

      let value = match[2];
      if (
        (value.startsWith("\"") && value.endsWith("\"")) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      process.env[key] = value;
    });
  } catch (error) {
    return;
  }
};

const loadSchema = async (pg) => {
  const schemaPath = path.join(__dirname, "..", "sql", "schema.sql");
  const schemaSql = await readFile(schemaPath, "utf8");
  await pg.exec(schemaSql);
};

const loadPglite = async () => {
  const module = await import("@electric-sql/pglite");
  return module.PGlite;
};

const chunkRows = (rows, size) => {
  const chunks = [];
  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size));
  }
  return chunks;
};

const buildInsertValues = (rows, columns) => {
  const params = [];
  const values = rows
    .map((row) => {
      const placeholders = columns.map((column) => {
        params.push(row[column]);
        return `$${params.length}`;
      });
      return `(${placeholders.join(", ")})`;
    })
    .join(", ");

  return { values, params };
};

const insertRows = async ({ pg, table, rows }) => {
  if (!rows.length) {
    return;
  }

  const updates = table.updateColumns
    .map((column) => `${column} = EXCLUDED.${column}`)
    .join(", ");
  const conflictClause = table.conflictTarget
    ? ` ON CONFLICT (${table.conflictTarget}) DO UPDATE SET ${updates}`
    : "";

  for (const chunk of chunkRows(rows, INSERT_CHUNK_SIZE)) {
    const { values, params } = buildInsertValues(chunk, table.columns);
    const sql = `INSERT INTO ${table.name} (${table.columns.join(", ")}) VALUES ${values}${conflictClause}`;
    await pg.query(sql, params);
  }
};

const fetchAllRows = async ({ supabase, table }) => {
  const columns = table.columns.join(", ");
  const data = [];
  let from = 0;

  let hasMore = true;
  while (hasMore) {
    let query = supabase
      .from(table.name)
      .select(columns)
      .range(from, from + PAGE_SIZE - 1);

    if (table.orderBy) {
      query = query.order(table.orderBy, { ascending: true });
    }

    const { data: batch, error } = await query;
    if (error) {
      throw error;
    }

    if (!batch || batch.length === 0) {
      hasMore = false;
      continue;
    }

    data.push(...batch);
    if (batch.length < PAGE_SIZE) {
      hasMore = false;
      continue;
    }

    from += PAGE_SIZE;
  }

  return data;
};

const clearLocalData = async (pg) => {
  await pg.query("DELETE FROM transaction_splits");
  await pg.query("DELETE FROM transactions");
  await pg.query("DELETE FROM profiles");
  await pg.query("DELETE FROM categories");
};

const quoteIdentifier = (value) => `"${String(value).replace(/"/g, '""')}"`;

const resetSequence = async (pg, table) => {
  const allowedTables = TABLES.map((t) => t.name);
  if (!allowedTables.includes(table)) {
    throw new Error(`Invalid table name for resetSequence: ${table}`);
  }

  const quotedTable = quoteIdentifier(table);
  const sql = `
    SELECT setval(
      pg_get_serial_sequence($1, 'id'),
      COALESCE((SELECT MAX(id) FROM ${quotedTable}), 0),
      true
    )
  `;

  await pg.query(sql, [table]);
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  const envIndex = args.indexOf("--env");
  const envPath = envIndex === -1 ? null : args[envIndex + 1];

  return {
    replace: args.includes("--replace"),
    envPath,
  };
};

const run = async () => {
  const args = parseArgs();
  const repoRoot = path.resolve(__dirname, "..", "..", "..");
  const envPath = args.envPath
    ? path.resolve(process.cwd(), args.envPath)
    : path.join(repoRoot, ".env");

  await loadEnvFile(envPath);

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const pgliteDataDir = process.env.PGLITE_DATA_DIR;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the environment.");
  }

  if (!pgliteDataDir) {
    throw new Error("Missing PGLITE_DATA_DIR in the environment.");
  }

  const resolvedDataDir = resolveDataDir(pgliteDataDir, repoRoot);
  await ensureDataDir(resolvedDataDir);

  const PGlite = await loadPglite();
  const pg = await PGlite.create(resolvedDataDir);

  await loadSchema(pg);

  if (args.replace) {
    console.log("Clearing local PGlite data...");
    await clearLocalData(pg);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  const hasExistingData = await hasDataDirContents(resolvedDataDir);
  const modeLabel = args.replace ? "replace" : hasExistingData ? "merge" : "seed";
  console.log(`Syncing Supabase data into ${resolvedDataDir} (${modeLabel} mode)...`);

  for (const table of TABLES) {
    console.log(`Fetching ${table.name}...`);
    const rows = await fetchAllRows({ supabase, table });
    console.log(`Inserting ${rows.length} rows into ${table.name}...`);
    await insertRows({ pg, table, rows });
  }

  for (const table of TABLES) {
    await resetSequence(pg, table.name);
  }

  console.log("Sync complete.");
};

run().catch((error) => {
  console.error("Supabase sync failed:", error.message || error);
  process.exit(1);
});
