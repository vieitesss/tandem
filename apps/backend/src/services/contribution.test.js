const { describe, expect, test } = require("bun:test");

const { contributionOf } = require("./contribution");

describe("settlement contribution", () => {
  test("classifies a custom split by each partner's delta", () => {
    expect(
      contributionOf(
        { type: "EXPENSE", split_mode: "custom", payer_id: 1, amount: 10 },
        [
          { user_id: 1, amount: 3.3 },
          { user_id: 2, amount: 6.7 },
        ]
      )
    ).toEqual([
      { profile_id: 1, delta: 6.7 },
      { profile_id: 2, delta: -6.7 },
    ]);
  });

  test("classifies owed and personal expenses", () => {
    expect(
      contributionOf({ type: "EXPENSE", split_mode: "owed", payer_id: 1, beneficiary_id: 2, amount: 25 })
    ).toEqual([
      { profile_id: 1, delta: 25 },
      { profile_id: 2, delta: -25 },
    ]);
    expect(
      contributionOf({ type: "EXPENSE", split_mode: "none", payer_id: 1, amount: 25 })
    ).toEqual([]);
  });

  test("classifies settlements and ignores income", () => {
    expect(
      contributionOf({ type: "LIQUIDATION", payer_id: 2, beneficiary_id: 1, amount: 8 })
    ).toEqual([
      { profile_id: 2, delta: 8 },
      { profile_id: 1, delta: -8 },
    ]);
    expect(
      contributionOf({ type: "INCOME", payer_id: 1, beneficiary_id: 1, amount: 100 })
    ).toEqual([]);
  });
});
