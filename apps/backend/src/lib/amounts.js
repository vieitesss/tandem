const roundAmount = (value) => Number(Number(value || 0).toFixed(2));

/**
 * Allocates an amount across multiple percentages with remainder distribution.
 * Ensures the sum of allocated amounts equals the original total amount.
 * The remainder (if any) is added to the split with the largest share.
 *
 * @param {number} totalAmount - The total amount to allocate
 * @param {number[]} percentages - Array of percentages (should sum to 100)
 * @returns {number[]} Array of allocated amounts
 */
const toAmounts = (totalAmount, percentages) => {
  if (!Array.isArray(percentages) || percentages.length === 0) {
    return [];
  }

  const total = Number(totalAmount || 0);
  if (!Number.isFinite(total)) {
    return [];
  }

  const amounts = percentages.map((percent) =>
    roundAmount((total * Number(percent || 0)) / 100)
  );
  const remainder = roundAmount(
    total - amounts.reduce((sum, amount) => sum + amount, 0)
  );

  if (remainder !== 0) {
    const largestShareIndex = percentages.indexOf(
      Math.max(...percentages.map((percent) => Number(percent || 0)))
    );
    amounts[largestShareIndex] = roundAmount(
      amounts[largestShareIndex] + remainder
    );
  }

  return amounts;
};

const toPercents = (totalAmount, amounts) => {
  if (!Array.isArray(amounts) || amounts.length === 0) {
    return [];
  }

  const total = Number(totalAmount || 0);
  if (!Number.isFinite(total) || total <= 0) {
    return [];
  }
  const percentages = amounts.map((amount) =>
    roundAmount((Number(amount || 0) / total) * 100)
  );
  const remainder = roundAmount(
    100 - percentages.reduce((sum, percent) => sum + percent, 0)
  );

  if (remainder !== 0) {
    const largestShareIndex = amounts.reduce(
      (bestIndex, amount, index) =>
        Number(amount || 0) > Number(amounts[bestIndex] || 0)
          ? index
          : bestIndex,
      0
    );
    percentages[largestShareIndex] = roundAmount(
      percentages[largestShareIndex] + remainder
    );
  }

  return percentages;
};

const addAmount = (map, profileId, amount) => {
  if (!profileId && profileId !== 0) {
    return;
  }

  const current = map.get(profileId) || 0;
  const next = roundAmount(current + Number(amount || 0));
  map.set(profileId, next);
};

module.exports = { roundAmount, toAmounts, toPercents, addAmount };
