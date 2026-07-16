const { describe, expect, test } = require("bun:test");

const { buildDebtSummary } = require("./debtSummary");

describe("settlement balance", () => {
  test("folds custom, owed, personal, settlement, and income transactions", async () => {
    const db = {
      listProfiles: async () => ({
        data: [
          { id: 1, display_name: "Alex" },
          { id: 2, display_name: "Sam" },
        ],
        error: null,
      }),
      listTransactions: async () => ({
        data: [
          { id: 1, type: "EXPENSE", split_mode: "custom", payer_id: 1, amount: 10, date: "2025-01-01" },
          { id: 2, type: "EXPENSE", split_mode: "owed", payer_id: 1, beneficiary_id: 2, amount: 20, date: "2025-01-02" },
          { id: 3, type: "EXPENSE", split_mode: "none", payer_id: 1, amount: 30, date: "2025-01-03" },
          { id: 4, type: "LIQUIDATION", split_mode: "none", payer_id: 2, beneficiary_id: 1, amount: 4, date: "2025-01-04" },
          { id: 5, type: "INCOME", split_mode: "none", payer_id: 1, beneficiary_id: 1, amount: 100, date: "2025-01-05" },
        ],
        error: null,
      }),
      listTransactionSplitsByTransactionIds: async () => ({
        data: [
          { transaction_id: 1, user_id: 1, amount: 5 },
          { transaction_id: 1, user_id: 2, amount: 5 },
        ],
        error: null,
      }),
    };

    const result = await buildDebtSummary({ db });

    expect(result.error).toBeUndefined();
    expect(result.data.net_by_profile).toEqual({ 1: 21, 2: -21 });
    expect(result.data.balance).toEqual({
      from_profile_id: 2,
      to_profile_id: 1,
      amount: 21,
    });
  });
});
