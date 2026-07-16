const { describe, expect, test } = require("bun:test");

const { summarizeTimeline } = require("./timeline");

describe("Insights aggregation", () => {
  test("shows contiguous expense spending and ranks categories by amount", () => {
    const result = summarizeTimeline(
      [
        { id: 1, date: "2025-01-03", type: "EXPENSE", amount: 20, category: "Food", split_mode: "none" },
        { id: 2, date: "2025-01-05", type: "EXPENSE", amount: 100, category: "Home", split_mode: "custom", note: "Lamp" },
        { id: 3, date: "2025-01-20", type: "INCOME", amount: 500, category: null, split_mode: "none" },
        { id: 4, date: "2025-03-02", type: "EXPENSE", amount: 40, category: "Food", split_mode: "owed" },
        { id: 5, date: "2025-03-04", type: "LIQUIDATION", amount: 25, category: null, split_mode: "none" },
        { id: 6, date: "2025-04-01", type: "INCOME", amount: 10, category: null, split_mode: "none" },
      ],
      "2025-04"
    );

    expect(result.monthly_data.map(({ month, total_spent }) => [month, total_spent])).toEqual([
      ["2025-01", 120],
      ["2025-02", 0],
      ["2025-03", 40],
      ["2025-04", 0],
    ]);
    expect(result.latest_month).toBe("2025-04");
    expect(result.monthly_data[0].categories).toEqual([
      { category: "Home", amount: 100, transaction_count: 1, share: 83 },
      { category: "Food", amount: 20, transaction_count: 1, share: 17 },
    ]);
    expect(result.monthly_data[0].income_total).toBe(500);
    expect(result.monthly_data[0].largest_shared_expense).toMatchObject({
      amount: 100,
      category: "Home",
    });
    expect(result.monthly_data[2].largest_shared_expense).toBeNull();
    expect(result.category_usage).toContainEqual({
      category: "Food",
      transaction_count: 2,
      last_used_date: "2025-03-02",
    });
  });

  test("keeps the current month when all data is future-dated", () => {
    const result = summarizeTimeline(
      [{ id: 1, date: "2025-06-01", type: "EXPENSE", amount: 20, category: "Food", split_mode: "none" }],
      "2025-04"
    );

    expect(result.monthly_data.map(({ month }) => month)).toEqual([
      "2025-04",
      "2025-05",
      "2025-06",
    ]);
  });
});
