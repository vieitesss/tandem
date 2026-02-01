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
const allocateAmount = (totalAmount, percentages) => {
  if (!percentages || percentages.length === 0) {
    return [];
  }

  // Calculate each split with rounding
  const splits = percentages.map((percent) =>
    roundAmount((totalAmount * percent) / 100)
  );

  // Calculate remainder
  const sumOfSplits = splits.reduce((sum, amount) => sum + amount, 0);
  const remainder = roundAmount(totalAmount - sumOfSplits);

  // Distribute remainder to the split with the largest percentage
  if (remainder !== 0 && splits.length > 0) {
    const maxPercentIndex = percentages.indexOf(Math.max(...percentages));
    splits[maxPercentIndex] = roundAmount(splits[maxPercentIndex] + remainder);
  }

  return splits;
};

const addAmount = (map, profileId, amount) => {
  if (!profileId && profileId !== 0) {
    return;
  }

  const current = map.get(profileId) || 0;
  const next = roundAmount(current + Number(amount || 0));
  map.set(profileId, next);
};

module.exports = { roundAmount, allocateAmount, addAmount };
