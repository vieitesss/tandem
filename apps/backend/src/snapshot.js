const path = require("path");
const { mkdir, rename, writeFile } = require("fs/promises");

const DEFAULT_SNAPSHOT_INTERVAL_MS = 60 * 60 * 1000;

const scheduleSnapshots = ({ pg, snapshotPath, intervalMs }) => {
  if (!pg || !snapshotPath) {
    return null;
  }

  const resolvedInterval = Number(intervalMs) || DEFAULT_SNAPSHOT_INTERVAL_MS;
  let isRunning = false;

  const ensureDirectory = async () => {
    const directory = path.dirname(snapshotPath);
    await mkdir(directory, { recursive: true });
  };

  const runSnapshot = async () => {
    if (isRunning) {
      return;
    }

    isRunning = true;

    try {
      await ensureDirectory();
      const dump = await pg.dumpDataDir();
      const buffer = Buffer.from(await dump.arrayBuffer());
      const tempPath = `${snapshotPath}.tmp`;

      await writeFile(tempPath, buffer);
      await rename(tempPath, snapshotPath);
      console.log(`PGlite snapshot saved to ${snapshotPath}`);
    } catch (error) {
      console.error("Failed to snapshot PGlite data:", error);
    } finally {
      isRunning = false;
    }
  };

  runSnapshot();
  const timer = setInterval(runSnapshot, resolvedInterval);

  return () => clearInterval(timer);
};

const resolveSnapshotPath = (dataDir) => {
  if (!dataDir) {
    return null;
  }

  const normalizedDataDir = String(dataDir).startsWith("file://")
    ? String(dataDir).replace("file://", "")
    : dataDir;
  const resolvedDataDir = path.resolve(process.cwd(), normalizedDataDir);
  return path.join(path.dirname(resolvedDataDir), "tandem-db.tar");
};

module.exports = {
  scheduleSnapshots,
  resolveSnapshotPath,
  DEFAULT_SNAPSHOT_INTERVAL_MS,
};
