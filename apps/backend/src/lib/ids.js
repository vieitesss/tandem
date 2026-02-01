const normalizeId = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const numericId = Number(value);

  if (Number.isNaN(numericId) || numericId <= 0) {
    return Number.NaN;
  }

  return numericId;
};

module.exports = { normalizeId };
