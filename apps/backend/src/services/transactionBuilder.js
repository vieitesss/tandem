const { normalizeId } = require("../lib/ids");
const { toAmounts, toPercents } = require("../lib/amounts");
const { expenseSplitModes } = require("../lib/validation");

const transactionTypes = new Set(["EXPENSE", "INCOME", "LIQUIDATION"]);

class TransactionValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "TransactionValidationError";
    this.code = "INVALID_TRANSACTION";
  }
}

const invalid = (message) => ({
  error: new TransactionValidationError(message),
});

const validateSplitPercentages = (splits) => {
  if (!Array.isArray(splits) || splits.length === 0) {
    return invalid("Split percentages are required.");
  }

  const normalized = splits.map((split) => ({
    user_id: normalizeId(split?.user_id),
    percent: Number(split?.percent || 0),
  }));
  const totalPercent = normalized.reduce((sum, split) => sum + split.percent, 0);
  const invalidPercent = normalized.some(
    (split) =>
      !Number.isFinite(split.percent) ||
      split.percent <= 0 ||
      !split.user_id
  );

  if (Math.abs(totalPercent - 100) > 0.01 || invalidPercent) {
    return invalid("Split percentages must total 100%.");
  }

  return { error: null, splits: normalized };
};

const buildTransaction = (input = {}) => {
  const {
    payer_id,
    amount,
    category,
    date,
    note,
    type,
    split_mode,
    splits_percent,
    beneficiary_id,
  } = input || {};

  if (!amount || !type || !date) {
    return invalid("Invalid payload.");
  }

  const normalizedAmount = Number(amount);
  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    return invalid("Invalid payload.");
  }

  if (!transactionTypes.has(type)) {
    return invalid("Invalid transaction type.");
  }

  const isIncome = type === "INCOME";
  const isLiquidation = type === "LIQUIDATION";
  const normalizedPayerId = normalizeId(payer_id);
  const normalizedBeneficiaryId = normalizeId(beneficiary_id);
  const requestedSplitMode = split_mode || "custom";

  if (!expenseSplitModes.has(requestedSplitMode) && !isIncome && !isLiquidation) {
    return invalid("Invalid split mode.");
  }

  if (Number.isNaN(normalizedPayerId) || Number.isNaN(normalizedBeneficiaryId)) {
    return invalid("Profile ids must be numbers.");
  }

  if (isLiquidation && !normalizedBeneficiaryId) {
    return invalid("Liquidation requires a beneficiary.");
  }

  if (
    isLiquidation &&
    normalizedBeneficiaryId &&
    normalizedPayerId &&
    normalizedBeneficiaryId === normalizedPayerId
  ) {
    return invalid("Liquidation requires another profile.");
  }

  if (isIncome && !normalizedBeneficiaryId && !normalizedPayerId) {
    return invalid("Income requires a recipient.");
  }

  if (!isIncome && !normalizedPayerId) {
    return invalid("Payer is required.");
  }

  if (requestedSplitMode === "owed" && !normalizedBeneficiaryId) {
    return invalid("Owed expenses need a beneficiary.");
  }

  if (
    requestedSplitMode === "owed" &&
    normalizedBeneficiaryId &&
    normalizedBeneficiaryId === normalizedPayerId
  ) {
    return invalid("Owed expenses need another profile.");
  }

  const payerForInsert = isIncome
    ? normalizedBeneficiaryId || normalizedPayerId
    : normalizedPayerId;
  const transaction = {
    payer_id: payerForInsert,
    beneficiary_id: isIncome
      ? payerForInsert
      : isLiquidation
        ? normalizedBeneficiaryId
        : requestedSplitMode === "owed"
          ? normalizedBeneficiaryId
          : null,
    split_mode: isIncome || isLiquidation ? "none" : requestedSplitMode,
    amount: normalizedAmount,
    category: isIncome || isLiquidation ? null : category,
    date,
    note,
    type,
  };

  if (transaction.split_mode !== "custom") {
    return { error: null, transaction, splits: [] };
  }

  const validatedSplits = validateSplitPercentages(splits_percent);
  if (validatedSplits.error) {
    return validatedSplits;
  }

  const amounts = toAmounts(
    normalizedAmount,
    validatedSplits.splits.map((split) => split.percent)
  );

  return {
    error: null,
    transaction,
    splits: validatedSplits.splits.map((split, index) => ({
      user_id: split.user_id,
      amount: amounts[index],
    })),
  };
};

const buildTransactionUpdate = (
  existing,
  input = {},
  existingSplits = []
) => {
  const {
    payer_id,
    amount,
    category,
    date,
    note,
    split_mode,
    beneficiary_id,
    splits_percent,
  } = input || {};
  const hasSplitsPercentPayload = splits_percent !== undefined;
  const updates = {};

  if (date !== undefined) {
    if (!date) {
      return invalid("Date is required.");
    }
    updates.date = date;
  }

  if (amount !== undefined) {
    const normalizedAmount = Number(amount);
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      return invalid("Amount must be greater than 0.");
    }
    updates.amount = normalizedAmount;
  }

  let updatedPayerId = existing.payer_id;
  let updatedSplitMode = existing.split_mode;
  let updatedBeneficiaryId = existing.beneficiary_id;

  if (payer_id !== undefined) {
    const normalizedPayerId = normalizeId(payer_id);

    if (Number.isNaN(normalizedPayerId)) {
      return invalid("Payer must be a number.");
    }

    if (!normalizedPayerId) {
      return invalid("Payer is required.");
    }

    updatedPayerId = normalizedPayerId;
    updates.payer_id = normalizedPayerId;
  }

  if (category !== undefined) {
    if (existing.type === "EXPENSE" && !category) {
      return invalid("Category is required.");
    }
    updates.category = existing.type === "EXPENSE" ? category : null;
  } else if (existing.type !== "EXPENSE" && existing.category) {
    updates.category = null;
  }

  if (note !== undefined) {
    updates.note = note ? String(note).trim() : null;
  }

  if (split_mode !== undefined) {
    if (existing.type !== "EXPENSE") {
      return invalid("Split mode only applies to expenses.");
    }

    if (!expenseSplitModes.has(split_mode)) {
      return invalid("Invalid split mode.");
    }

    if (
      split_mode === "custom" &&
      existing.split_mode !== "custom" &&
      !hasSplitsPercentPayload
    ) {
      return invalid("Custom split percentages are required.");
    }

    updatedSplitMode = split_mode;
    updates.split_mode = split_mode;

    if (split_mode !== "owed") {
      updatedBeneficiaryId = null;
      updates.beneficiary_id = null;
    }
  }

  let normalizedSplitsPercent = null;

  if (hasSplitsPercentPayload) {
    if (existing.type !== "EXPENSE") {
      return invalid("Split percentages only apply to expenses.");
    }

    if (updatedSplitMode !== "custom") {
      return invalid("Split percentages require custom split mode.");
    }

    const validatedSplits = validateSplitPercentages(splits_percent);
    if (validatedSplits.error) {
      return validatedSplits;
    }
    normalizedSplitsPercent = validatedSplits.splits;
  }

  if (beneficiary_id !== undefined) {
    const normalizedBeneficiaryId = normalizeId(beneficiary_id);

    if (Number.isNaN(normalizedBeneficiaryId)) {
      return invalid("Beneficiary must be a number.");
    }

    if (existing.type === "EXPENSE") {
      if (updatedSplitMode !== "owed" && normalizedBeneficiaryId) {
        return invalid("Beneficiary only applies to owed.");
      }
    } else if (existing.type === "LIQUIDATION") {
      if (!normalizedBeneficiaryId) {
        return invalid("Liquidation requires a beneficiary.");
      }
    } else {
      return invalid(
        "Beneficiary only applies to expenses and liquidations."
      );
    }

    updatedBeneficiaryId = normalizedBeneficiaryId;
    updates.beneficiary_id = normalizedBeneficiaryId;
  }

  if (existing.type === "EXPENSE") {
    if (
      updatedSplitMode !== "owed" &&
      (updatedBeneficiaryId || updates.beneficiary_id)
    ) {
      updatedBeneficiaryId = null;
      updates.beneficiary_id = null;
    }

    if (updatedSplitMode === "owed" && !updatedBeneficiaryId) {
      return invalid("Owed expenses need a beneficiary.");
    }

    if (
      updatedSplitMode === "owed" &&
      updatedBeneficiaryId &&
      updatedBeneficiaryId === updatedPayerId
    ) {
      return invalid("Owed expenses need another profile.");
    }
  }

  if (existing.type === "LIQUIDATION") {
    if (!updatedBeneficiaryId) {
      return invalid("Liquidation requires a beneficiary.");
    }

    if (updatedBeneficiaryId === updatedPayerId) {
      return invalid("Liquidation requires another profile.");
    }
  }

  if (Object.keys(updates).length === 0) {
    return invalid("No updates provided.");
  }

  const updatedAmount = updates.amount ?? Number(existing.amount);
  let split_operation = null;

  if (
    existing.type === "EXPENSE" &&
    existing.split_mode === "custom" &&
    updatedSplitMode !== "custom"
  ) {
    split_operation = { action: "delete" };
  }

  const shouldReplaceCustomSplits =
    existing.type === "EXPENSE" &&
    updatedSplitMode === "custom" &&
    Array.isArray(normalizedSplitsPercent);

  if (shouldReplaceCustomSplits) {
    const percentages = normalizedSplitsPercent.map((split) => split.percent);
    const amounts = toAmounts(updatedAmount, percentages);
    split_operation = {
      action: "replace",
      rows: normalizedSplitsPercent.map((split, index) => ({
        user_id: split.user_id,
        amount: amounts[index],
      })),
    };
  }

  const shouldRebalanceCustomSplits =
    existing.type === "EXPENSE" &&
    updatedSplitMode === "custom" &&
    !shouldReplaceCustomSplits &&
    amount !== undefined;

  if (shouldRebalanceCustomSplits && Array.isArray(existingSplits)) {
    const total = existingSplits.reduce(
      (sum, split) => sum + Number(split.amount || 0),
      0
    );

    if (existingSplits.length > 0 && total > 0) {
      const proportions = toPercents(total, existingSplits.map((split) => split.amount));
      const amounts = toAmounts(updatedAmount, proportions);
      split_operation = {
        action: "update",
        rows: existingSplits.map((split, index) => ({
          id: split.id,
          amount: amounts[index],
        })),
      };
    }
  }

  return { error: null, updates, split_operation };
};

module.exports = {
  TransactionValidationError,
  buildTransaction,
  buildTransactionUpdate,
};
