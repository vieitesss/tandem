const express = require("express");
const { normalizeId } = require("../lib/ids");
const { allocateAmount } = require("../lib/amounts");
const { parseMonthRange, expenseSplitModes } = require("../lib/validation");

const createTransactionsRouter = ({ db }) => {
  const router = express.Router();

  router.get("/transactions", async (req, res) => {
    const { type, category, month } = req.query || {};

    let startDate = null;
    let endDate = null;

    if (month) {
      const monthRange = parseMonthRange(month);

      if (monthRange.error === "format") {
        return res.status(400).json({ error: "Month must be YYYY-MM." });
      }

      if (monthRange.error === "invalid") {
        return res.status(400).json({ error: "Invalid month." });
      }

      startDate = monthRange.startDate;
      endDate = monthRange.endDate;
    }

    const { data: transactions, error } = await db.listTransactions({
      type,
      category,
      startDate,
      endDate,
    });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!transactions || transactions.length === 0) {
      return res.json([]);
    }

    const payerIds = Array.from(
      new Set(
        transactions.map((transaction) => transaction.payer_id).filter(Boolean)
      )
    );

    let profilesById = new Map();

    if (payerIds.length > 0) {
      const { data: profiles, error: profileError } =
        await db.listProfilesByIds(payerIds);

      if (profileError) {
        return res.status(500).json({ error: profileError.message });
      }

      profilesById = new Map(
        profiles.map((profile) => [profile.id, profile.display_name])
      );
    }

    const response = transactions.map((transaction) => ({
      ...transaction,
      payer_name: profilesById.get(transaction.payer_id) || null,
    }));

    return res.json(response);
  });

  router.get("/transactions/latest-month", async (_req, res) => {
    const { data, error } = await db.getLatestTransactionMonth();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ latest_month: data || null });
  });

  router.get("/transactions/months", async (_req, res) => {
    const { data, error } = await db.listTransactionMonths();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json(Array.isArray(data) ? data : []);
  });

  router.post("/transactions", async (req, res) => {
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
    } = req.body || {};

    if (!amount || !type || !date) {
      return res.status(400).json({ error: "Invalid payload." });
    }

    const isIncome = type === "INCOME";
    const isLiquidation = type === "LIQUIDATION";
    const normalizedPayerId = normalizeId(payer_id);
    const normalizedBeneficiaryId = normalizeId(beneficiary_id);
    const requestedSplitMode = split_mode || "custom";

    if (
      Number.isNaN(normalizedPayerId) ||
      Number.isNaN(normalizedBeneficiaryId)
    ) {
      return res.status(400).json({ error: "Profile ids must be numbers." });
    }

    if (isLiquidation && !normalizedBeneficiaryId) {
      return res
        .status(400)
        .json({ error: "Liquidation requires a beneficiary." });
    }

    if (
      isLiquidation &&
      normalizedBeneficiaryId &&
      normalizedPayerId &&
      normalizedBeneficiaryId === normalizedPayerId
    ) {
      return res
        .status(400)
        .json({ error: "Liquidation requires another profile." });
    }

    if (isIncome && !normalizedBeneficiaryId && !normalizedPayerId) {
      return res.status(400).json({ error: "Income requires a recipient." });
    }

    if (!isIncome && !normalizedPayerId) {
      return res.status(400).json({ error: "Payer is required." });
    }

    if (
      !isIncome &&
      !isLiquidation &&
      !expenseSplitModes.has(requestedSplitMode)
    ) {
      return res.status(400).json({ error: "Invalid split mode." });
    }

    if (requestedSplitMode === "owed" && !normalizedBeneficiaryId) {
      return res
        .status(400)
        .json({ error: "Owed expenses need a beneficiary." });
    }

    if (
      requestedSplitMode === "owed" &&
      normalizedBeneficiaryId &&
      normalizedBeneficiaryId === normalizedPayerId
    ) {
      return res
        .status(400)
        .json({ error: "Owed expenses need another profile." });
    }

    const payerForInsert = isIncome
      ? normalizedBeneficiaryId || normalizedPayerId
      : normalizedPayerId;
    const categoryForInsert = isIncome || isLiquidation ? null : category;
    const splitModeForInsert =
      isIncome || isLiquidation ? "none" : requestedSplitMode;
    const beneficiaryForInsert = isIncome
      ? payerForInsert
      : isLiquidation
        ? normalizedBeneficiaryId
        : requestedSplitMode === "owed"
          ? normalizedBeneficiaryId
          : null;

    const { data: transaction, error: transactionError } =
      await db.insertTransaction({
        payer_id: payerForInsert,
        beneficiary_id: beneficiaryForInsert,
        split_mode: splitModeForInsert,
        amount,
        category: categoryForInsert,
        date,
        note,
        type,
      });

    if (transactionError) {
      return res.status(500).json({ error: transactionError.message });
    }

    const normalizedAmount = Number(amount);

    if (transaction.split_mode === "custom") {
      if (!Array.isArray(splits_percent)) {
        return res
          .status(400)
          .json({ error: "Split percentages are required." });
      }

      const totalPercent = splits_percent.reduce(
        (sum, split) => sum + Number(split.percent || 0),
        0
      );

      const invalidPercent = splits_percent.some((split) => {
        const normalizedSplitId = normalizeId(split.user_id);
        return Number(split.percent || 0) <= 0 || !normalizedSplitId;
      });

      if (Math.abs(totalPercent - 100) > 0.01 || invalidPercent) {
        return res
          .status(400)
          .json({ error: "Split percentages must total 100%." });
      }

      const percentages = splits_percent.map((split) =>
        Number(split.percent || 0)
      );
      const allocatedAmounts = allocateAmount(normalizedAmount, percentages);

      const splitRows = splits_percent.map((split, index) => {
        return {
          transaction_id: transaction.id,
          user_id: Number(split.user_id),
          amount: allocatedAmounts[index],
        };
      });

      const { error: splitsError } = await db.insertTransactionSplits(splitRows);

      if (splitsError) {
        return res.status(500).json({ error: splitsError.message });
      }
    }

    return res.status(201).json({ id: transaction.id });
  });

  router.patch("/transactions/:id", async (req, res) => {
    const { id } = req.params;
    const {
      payer_id,
      amount,
      category,
      date,
      note,
      split_mode,
      beneficiary_id,
      splits_percent,
    } = req.body || {};
    const transactionId = normalizeId(id);
    const hasSplitsPercentPayload = splits_percent !== undefined;

    if (!id || Number.isNaN(transactionId)) {
      return res.status(400).json({ error: "Transaction id must be a number." });
    }

    const { data: existing, error: existingError } =
      await db.getTransactionById(transactionId);

    if (existingError) {
      return res.status(500).json({ error: existingError.message });
    }

    if (!existing) {
      return res.status(404).json({ error: "Transaction not found." });
    }

    const updates = {};

    if (date !== undefined) {
      if (!date) {
        return res.status(400).json({ error: "Date is required." });
      }
      updates.date = date;
    }

    if (amount !== undefined) {
      const normalizedAmount = Number(amount);
      if (Number.isNaN(normalizedAmount) || normalizedAmount <= 0) {
        return res.status(400).json({ error: "Amount must be greater than 0." });
      }
      updates.amount = normalizedAmount;
    }

    let updatedPayerId = existing.payer_id;
    let updatedSplitMode = existing.split_mode;
    let updatedBeneficiaryId = existing.beneficiary_id;

    if (payer_id !== undefined) {
      const normalizedPayerId = normalizeId(payer_id);

      if (Number.isNaN(normalizedPayerId)) {
        return res.status(400).json({ error: "Payer must be a number." });
      }

      if (!normalizedPayerId) {
        return res.status(400).json({ error: "Payer is required." });
      }

      updatedPayerId = normalizedPayerId;
      updates.payer_id = normalizedPayerId;
    }

    if (category !== undefined) {
      if (existing.type === "EXPENSE" && !category) {
        return res.status(400).json({ error: "Category is required." });
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
        return res
          .status(400)
          .json({ error: "Split mode only applies to expenses." });
      }

      if (!expenseSplitModes.has(split_mode)) {
        return res.status(400).json({ error: "Invalid split mode." });
      }

      if (
        split_mode === "custom" &&
        existing.split_mode !== "custom" &&
        !hasSplitsPercentPayload
      ) {
        return res.status(400).json({
          error: "Custom split percentages are required.",
        });
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
        return res
          .status(400)
          .json({ error: "Split percentages only apply to expenses." });
      }

      if (updatedSplitMode !== "custom") {
        return res
          .status(400)
          .json({ error: "Split percentages require custom split mode." });
      }

      if (!Array.isArray(splits_percent) || splits_percent.length === 0) {
        return res
          .status(400)
          .json({ error: "Split percentages are required." });
      }

      const totalPercent = splits_percent.reduce(
        (sum, split) => sum + Number(split.percent || 0),
        0
      );

      const invalidPercent = splits_percent.some((split) => {
        const normalizedSplitId = normalizeId(split.user_id);
        return Number(split.percent || 0) <= 0 || !normalizedSplitId;
      });

      if (Math.abs(totalPercent - 100) > 0.01 || invalidPercent) {
        return res
          .status(400)
          .json({ error: "Split percentages must total 100%." });
      }

      normalizedSplitsPercent = splits_percent.map((split) => ({
        user_id: Number(split.user_id),
        percent: Number(split.percent || 0),
      }));
    }

    if (beneficiary_id !== undefined) {
      const normalizedBeneficiaryId = normalizeId(beneficiary_id);

      if (Number.isNaN(normalizedBeneficiaryId)) {
        return res.status(400).json({ error: "Beneficiary must be a number." });
      }

      if (existing.type === "EXPENSE") {
        if (updatedSplitMode !== "owed" && normalizedBeneficiaryId) {
          return res
            .status(400)
            .json({ error: "Beneficiary only applies to owed." });
        }
      } else if (existing.type === "LIQUIDATION") {
        if (!normalizedBeneficiaryId) {
          return res
            .status(400)
            .json({ error: "Liquidation requires a beneficiary." });
        }
      } else {
        return res
          .status(400)
          .json({ error: "Beneficiary only applies to expenses and liquidations." });
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
        return res
          .status(400)
          .json({ error: "Owed expenses need a beneficiary." });
      }

      if (
        updatedSplitMode === "owed" &&
        updatedBeneficiaryId &&
        updatedBeneficiaryId === updatedPayerId
      ) {
        return res
          .status(400)
          .json({ error: "Owed expenses need another profile." });
      }
    }

    if (existing.type === "LIQUIDATION") {
      if (!updatedBeneficiaryId) {
        return res
          .status(400)
          .json({ error: "Liquidation requires a beneficiary." });
      }

      if (updatedBeneficiaryId === updatedPayerId) {
        return res
          .status(400)
          .json({ error: "Liquidation requires another profile." });
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No updates provided." });
    }

    const { data: updated, error: updateError } = await db.updateTransaction(
      transactionId,
      updates
    );

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    if (
      existing.type === "EXPENSE" &&
      existing.split_mode === "custom" &&
      updated.split_mode !== "custom"
    ) {
      const { error: deleteError } =
        await db.deleteTransactionSplitsByTransactionId(transactionId);

      if (deleteError) {
        return res.status(500).json({ error: deleteError.message });
      }
    }

    const shouldReplaceCustomSplits =
      existing.type === "EXPENSE" &&
      updated.split_mode === "custom" &&
      Array.isArray(normalizedSplitsPercent);

    if (shouldReplaceCustomSplits) {
      const { error: clearSplitsError } =
        await db.deleteTransactionSplitsByTransactionId(transactionId);

      if (clearSplitsError) {
        return res.status(500).json({ error: clearSplitsError.message });
      }

      const percentages = normalizedSplitsPercent.map((split) => split.percent);
      const allocatedAmounts = allocateAmount(updated.amount, percentages);
      const splitRows = normalizedSplitsPercent.map((split, index) => ({
        transaction_id: transactionId,
        user_id: split.user_id,
        amount: allocatedAmounts[index],
      }));

      const { error: insertSplitsError } = await db.insertTransactionSplits(splitRows);

      if (insertSplitsError) {
        return res.status(500).json({ error: insertSplitsError.message });
      }
    }

    const shouldRebalanceCustomSplits =
      existing.type === "EXPENSE" &&
      updated.split_mode === "custom" &&
      !shouldReplaceCustomSplits &&
      amount !== undefined;

    if (shouldRebalanceCustomSplits) {
      const { data: splits, error: splitsError } =
        await db.listTransactionSplitsByTransactionId(transactionId);

      if (splitsError) {
        return res.status(500).json({ error: splitsError.message });
      }

      if (splits && splits.length > 0) {
        const total = splits.reduce(
          (sum, split) => sum + Number(split.amount || 0),
          0
        );

        if (total > 0) {
          // Calculate proportions (percentages) from current split amounts
          const proportions = splits.map(
            (split) => (Number(split.amount || 0) / total) * 100
          );
          const allocatedAmounts = allocateAmount(updated.amount, proportions);

          const splitUpdates = splits.map((split, index) => ({
            id: split.id,
            amount: allocatedAmounts[index],
          }));
          const { error: splitError } = await db.updateTransactionSplitAmounts(
            splitUpdates
          );

          if (splitError) {
            return res.status(500).json({ error: splitError.message });
          }
        }
      }
    }

    let payerName = null;

    if (updated.payer_id) {
      const { data: profiles, error: profileError } = await db.listProfilesByIds(
        [updated.payer_id]
      );

      if (profileError) {
        return res.status(500).json({ error: profileError.message });
      }

      payerName = profiles && profiles[0] ? profiles[0].display_name : null;
    }

    return res.json({ ...updated, payer_name: payerName });
  });

  router.delete("/transactions/:id", async (req, res) => {
    const { id } = req.params;
    const transactionId = normalizeId(id);

    if (!id || Number.isNaN(transactionId)) {
      return res.status(400).json({ error: "Transaction id must be a number." });
    }

    const { data: existing, error: existingError } =
      await db.getTransactionById(transactionId);

    if (existingError) {
      return res.status(500).json({ error: existingError.message });
    }

    if (!existing) {
      return res.status(404).json({ error: "Transaction not found." });
    }

    const { error: splitsError } =
      await db.deleteTransactionSplitsByTransactionId(transactionId);

    if (splitsError) {
      return res.status(500).json({ error: splitsError.message });
    }

    const { error: deleteError } = await db.deleteTransaction(transactionId);

    if (deleteError) {
      return res.status(500).json({ error: deleteError.message });
    }

    return res.json({ id: transactionId });
  });

  return router;
};

module.exports = { createTransactionsRouter };
