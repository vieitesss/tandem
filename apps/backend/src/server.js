const { createDataAdapter } = require("./data");
const { createRealtimeBus } = require("./realtime");
const {
  scheduleSnapshots,
  resolveSnapshotPath,
  DEFAULT_SNAPSHOT_INTERVAL_MS,
} = require("./snapshot");
const { createApp } = require("./app");
const { runPendingMigrations } = require("./migrations");

const { PORT = 4000 } = process.env;

const startServer = async () => {
  const realtimeBus = createRealtimeBus();

  const { adapter, mode, pg } = await createDataAdapter({
    emitChange: realtimeBus.emitChange,
  });

  const db = adapter;
  const dbMode = mode;

  await runPendingMigrations({ db, logger: console });

  if (mode === "local" && pg) {
    const snapshotPath = String(process.env.PGLITE_SNAPSHOT_PATH || "").trim();
    const resolvedPath =
      snapshotPath || resolveSnapshotPath(process.env.PGLITE_DATA_DIR);
    scheduleSnapshots({
      pg,
      snapshotPath: resolvedPath,
      intervalMs:
        Number(process.env.PGLITE_SNAPSHOT_INTERVAL_MS) ||
        DEFAULT_SNAPSHOT_INTERVAL_MS,
    });
  }

  const app = createApp({ db, realtimeBus, dbMode });

  app.listen(PORT, () => {
    console.log(`Backend listening on ${PORT} (${mode})`);
  });
};

module.exports = { startServer };
