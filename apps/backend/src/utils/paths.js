const path = require("path");

/**
 * Normalizes a data directory path by removing file:// prefix if present
 * @param {string} dataDir - The data directory path
 * @returns {string} Normalized path
 */
const normalizeDataDir = (dataDir) => {
  if (!dataDir) {
    return "";
  }

  return String(dataDir).startsWith("file://")
    ? String(dataDir).replace("file://", "")
    : String(dataDir);
};

/**
 * Resolves a data directory path relative to a base directory
 * @param {string} dataDir - The data directory path
 * @param {string} baseDir - The base directory for relative paths
 * @returns {string} Absolute resolved path
 */
const resolveDataDir = (dataDir, baseDir) => {
  const normalized = normalizeDataDir(dataDir);
  if (!normalized) {
    return "";
  }

  return path.isAbsolute(normalized)
    ? normalized
    : path.resolve(baseDir, normalized);
};

module.exports = { normalizeDataDir, resolveDataDir };
