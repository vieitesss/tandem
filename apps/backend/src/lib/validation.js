const expenseSplitModes = new Set(["custom", "none", "owed"]);

/**
 * Parse a month string in YYYY-MM format and return start/end dates.
 * @param {string} month - Month string (YYYY-MM)
 * @returns {{startDate?: string, endDate?: string, error?: "format" | "invalid"}}
 */
const parseMonthRange = (month) => {
  const match = String(month).match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    return { error: "format" };
  }

  const start = new Date(`${month}-01T00:00:00Z`);
  if (Number.isNaN(start.getTime())) {
    return { error: "invalid" };
  }

  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
};

/**
 * Check if a split mode is valid for expenses.
 * @param {string} mode - Split mode to check
 * @returns {boolean}
 */
const isValidExpenseSplitMode = (mode) => expenseSplitModes.has(mode);

module.exports = {
  expenseSplitModes,
  parseMonthRange,
  isValidExpenseSplitMode,
};
