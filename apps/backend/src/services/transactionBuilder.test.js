const { describe, expect, test } = require("bun:test");

const {
  TransactionValidationError,
  buildTransaction,
  buildTransactionUpdate,
} = require("./transactionBuilder");

describe("transaction write path", () => {
  test("builds a custom shared expense and allocated split rows", () => {
    const result = buildTransaction({
      payer_id: "1",
      amount: "10",
      category: "Food",
      date: "2025-01-01",
      type: "EXPENSE",
      split_mode: "custom",
      splits_percent: [
        { user_id: "1", percent: 33 },
        { user_id: "2", percent: 67 },
      ],
    });

    expect(result.error).toBeNull();
    expect(result.transaction).toMatchObject({
      payer_id: 1,
      beneficiary_id: null,
      split_mode: "custom",
      amount: 10,
      category: "Food",
      date: "2025-01-01",
      type: "EXPENSE",
    });
    expect(result.splits).toEqual([
      { user_id: 1, amount: 3.3 },
      { user_id: 2, amount: 6.7 },
    ]);
  });

  test("rejects an unknown transaction type without persistence data", () => {
    const result = buildTransaction({
      payer_id: 1,
      amount: 10,
      date: "2025-01-01",
      type: "REFUND",
    });

    expect(result.error).toBeInstanceOf(TransactionValidationError);
    expect(result.error.message).toBe("Invalid transaction type.");

  });

  test("returns the existing validation error for an invalid owed expense", () => {
    const result = buildTransaction({
      payer_id: 1,
      amount: 10,
      date: "2025-01-01",
      type: "EXPENSE",
      split_mode: "owed",
    });

    expect(result.error).toBeInstanceOf(TransactionValidationError);
    expect(result.error.message).toBe("Owed expenses need a beneficiary.");
  });

  test("rebalances saved custom proportions when an amount changes", () => {
    const result = buildTransactionUpdate(
      {
        id: 9,
        type: "EXPENSE",
        amount: 10,
        payer_id: 1,
        beneficiary_id: null,
        split_mode: "custom",
      },
      { amount: 20 },
      [
        { id: 101, user_id: 1, amount: 3.3 },
        { id: 102, user_id: 2, amount: 6.7 },
      ]
    );

    expect(result.error).toBeNull();
    expect(result.updates).toEqual({ amount: 20 });
    expect(result.split_operation).toEqual({
      action: "update",
      rows: [
        { id: 101, amount: 6.6 },
        { id: 102, amount: 13.4 },
      ],
    });
  });
});
