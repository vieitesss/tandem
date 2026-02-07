const { createDataAdapter } = require("../src/data");
const { runPendingMigrations } = require("../src/migrations");

const run = async () => {
  const { adapter, mode } = await createDataAdapter();
  console.log(`Checking database migrations (${mode})...`);

  const { applied, total } = await runPendingMigrations({ db: adapter, logger: console });

  if (!applied.length) {
    console.log(`No pending migrations. (${total} total registered)`);
    return;
  }

  applied.forEach((migration) => {
    console.log(
      `Migration ${migration.id} applied: ${migration.description} (${JSON.stringify(migration.details)})`
    );
  });

  console.log(`Applied ${applied.length} migration(s).`);
};

run().catch((error) => {
  console.error("Database migration failed:", error.message || error);
  process.exit(1);
});
