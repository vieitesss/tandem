const { describe, expect, test } = require("bun:test");

const { toAmounts, toPercents } = require("./amounts");

describe("split amount conversion", () => {
  test("keeps the total and gives the remainder to the largest share", () => {
    expect(toAmounts(10, [33, 33, 34])).toEqual([3.3, 3.3, 3.4]);
    expect(toAmounts(10, [33.33, 33.33, 33.33])).toEqual([3.34, 3.33, 3.33]);
  });

  test("supports a single split and empty input", () => {
    expect(toAmounts(12.5, [100])).toEqual([12.5]);
    expect(toAmounts(12.5, [])).toEqual([]);
  });

  test("converts amounts back to percentages with the same remainder rule", () => {
    expect(toPercents(10, [3.3, 3.3, 3.4])).toEqual([33, 33, 34]);
    expect(toPercents(3, [1, 1, 1])).toEqual([33.34, 33.33, 33.33]);
    expect(toPercents(10, [3.3, 3.3, 3.4]).reduce((sum, value) => sum + value, 0)).toBe(100);
  });
});
