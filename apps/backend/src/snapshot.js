const path = require("path");
const { mkdir, rename, writeFile, unlink, readdir, stat } = require("fs/promises");
const { normalizeDataDir } = require("./utils/paths");

const DEFAULT_SNAPSHOT_INTERVAL_MS = 60 * 60 * 1000;
const MAX_SNAPSHOT_BACKUPS = 3;
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 5000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const rotateBackups = async (snapshotPath) => {
  const directory = path.dirname(snapshotPath);
  const basename = path.basename(snapshotPath);

  try {
    const entries = await readdir(directory);
    const backups = entries
      .filter((file) => file.startsWith(`${basename}.backup.`))
      .map((file) => path.join(directory, file));

    // Sort by modification time (newest first)
    const backupStats = await Promise.all(
      backups.map(async (file) => ({
        file,
        mtime: (await stat(file)).mtime,
      }))
    );
    backupStats.sort((a, b) => b.mtime - a.mtime);

    // Keep only MAX_SNAPSHOT_BACKUPS - 1 (to make room for new backup)
    const toDelete = backupStats.slice(MAX_SNAPSHOT_BACKUPS - 1);
    for (const { file } of toDelete) {
      await unlink(file);
      console.log(`Removed old snapshot backup: ${file}`);
    }
  } catch (error) {
    console.warn("Failed to rotate snapshot backups:", error.message);
  }
};

const createBackup = async (snapshotPath) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = `${snapshotPath}.backup.${timestamp}`;
    const content = await readdir(path.dirname(snapshotPath));

    if (content.includes(path.basename(snapshotPath))) {
      await rename(snapshotPath, backupPath);
      console.log(`Created snapshot backup: ${backupPath}`);
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.warn("Failed to create snapshot backup:", error.message);
    }
  }
};

let snapshotStatus = {
  lastAttempt: null,
  lastSuccess: null,
  lastError: null,
  consecutiveFailures: 0,
};

const getSnapshotStatus = () => ({ ...snapshotStatus });

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

  const attemptSnapshot = async (retryCount = 0) => {
    try {
      await ensureDirectory();
      const dump = await pg.dumpDataDir();
      const buffer = Buffer.from(await dump.arrayBuffer());
      const tempPath = `${snapshotPath}.tmp`;

      await writeFile(tempPath, buffer);

      // Rotate backups before creating new one
      await rotateBackups(snapshotPath);

      // Create backup of current snapshot
      await createBackup(snapshotPath);

      // Move new snapshot into place
      await rename(tempPath, snapshotPath);

      snapshotStatus.lastSuccess = new Date().toISOString();
      snapshotStatus.lastError = null;
      snapshotStatus.consecutiveFailures = 0;

      console.log(`PGlite snapshot saved to ${snapshotPath}`);
      return true;
    } catch (error) {
      snapshotStatus.lastError = error.message;
      snapshotStatus.consecutiveFailures++;

      if (retryCount < MAX_RETRY_ATTEMPTS) {
        const delayMs = RETRY_DELAY_MS * (2 ** retryCount);
        console.warn(
          `Failed to snapshot PGlite data (attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS + 1}): ${error.message}. Retrying in ${delayMs}ms...`
        );
        await sleep(delayMs);
        return attemptSnapshot(retryCount + 1);
      }

      console.error(
        `Failed to snapshot PGlite data after ${MAX_RETRY_ATTEMPTS + 1} attempts:`,
        error.message
      );
      return false;
    }
  };

  const runSnapshot = async () => {
    if (isRunning) {
      return;
    }

    isRunning = true;
    snapshotStatus.lastAttempt = new Date().toISOString();

    try {
      await attemptSnapshot();
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

  const normalizedDataDir = normalizeDataDir(dataDir);
  const resolvedDataDir = path.resolve(process.cwd(), normalizedDataDir);
  return path.join(path.dirname(resolvedDataDir), "tandem-db.tar");
};

module.exports = {
  scheduleSnapshots,
  resolveSnapshotPath,
  getSnapshotStatus,
  DEFAULT_SNAPSHOT_INTERVAL_MS,
};
