const express = require("express");
const { normalizeId } = require("../lib/ids");
const { toPercents } = require("../lib/amounts");
const { parseMonthRange } = require("../lib/validation");
const {
  buildTransaction,
  buildTransactionUpdate,
} = require("../services/transactionBuilder");

const attachSplitPercentages = async (db, transactions) => {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return { data: [], error: null };
  }

  const customTransactionIds = transactions
    .filter((transaction) => transaction?.id && transaction.split_mode === "custom")
    .map((transaction) => transaction.id);

  if (customTransactionIds.length === 0) {
    return {
      data: transactions.map((transaction) => ({
        ...transaction,
        splits_percent: [],
      })),
      error: null,
    };
  }

  const { data: splits, error } = await db.listTransactionSplitsByTransactionIds(
    customTransactionIds
  );

  if (error) {
    return { data: null, error };
  }

  const splitsByTransactionId = new Map();

  (splits || []).forEach((split) => {
    const current = splitsByTransactionId.get(split.transaction_id) || [];
    current.push(split);
    splitsByTransactionId.set(split.transaction_id, current);
  });

  return {
    data: transactions.map((transaction) => ({
      ...transaction,
      splits_percent:
        transaction?.split_mode === "custom"
          ? (() => {
              const splits = splitsByTransactionId.get(transaction.id) || [];
              const percentages = toPercents(
                transaction.amount,
                splits.map((split) => split.amount)
              );
              return splits.map((split, index) => ({
                user_id: split.user_id,
                percent: percentages[index],
              }));
            })()
          : [],
    })),
    error: null,
  };
};

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

    const { data: responseWithSplitPercentages, error: splitsError } =
      await attachSplitPercentages(db, response);

    if (splitsError) {
      return res.status(500).json({ error: splitsError.message });
    }

    return res.json(responseWithSplitPercentages);
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
    const result = buildTransaction(req.body || {});

    if (result.error) {
      return res.status(400).json({ error: result.error.message });
    }

    const { data: transaction, error: transactionError } =
      await db.insertTransaction(result.transaction);

    if (transactionError) {
      return res.status(500).json({ error: transactionError.message });
    }

    if (result.splits.length > 0) {
      const splitRows = result.splits.map((split) => ({
        transaction_id: transaction.id,
        ...split,
      }));
      const { error: splitsError } = await db.insertTransactionSplits(splitRows);

      if (splitsError) {
        return res.status(500).json({ error: splitsError.message });
      }
    }

    return res.status(201).json({ id: transaction.id });
  });

  router.patch("/transactions/:id", async (req, res) => {
    const { id } = req.params;
    const input = req.body || {};
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

    const shouldLoadExistingSplits =
      existing.type === "EXPENSE" &&
      existing.split_mode === "custom" &&
      input.amount !== undefined &&
      input.splits_percent === undefined &&
      (input.split_mode === undefined || input.split_mode === "custom");
    let result = buildTransactionUpdate(existing, input);

    if (result.error) {
      return res.status(400).json({ error: result.error.message });
    }

    if (shouldLoadExistingSplits) {
      const { data: splits, error: splitsError } =
        await db.listTransactionSplitsByTransactionId(transactionId);

      if (splitsError) {
        return res.status(500).json({ error: splitsError.message });
      }

      result = buildTransactionUpdate(existing, input, splits || []);
    }

    const { updates, split_operation } = result;
    const { data: updated, error: updateError } = await db.updateTransaction(
      transactionId,
      updates
    );

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    if (split_operation?.action === "delete") {
      const { error: deleteError } =
        await db.deleteTransactionSplitsByTransactionId(transactionId);

      if (deleteError) {
        return res.status(500).json({ error: deleteError.message });
      }
    }

    if (split_operation?.action === "replace") {
      const { error: clearSplitsError } =
        await db.deleteTransactionSplitsByTransactionId(transactionId);

      if (clearSplitsError) {
        return res.status(500).json({ error: clearSplitsError.message });
      }

      const splitRows = split_operation.rows.map((split) => ({
        transaction_id: transactionId,
        ...split,
      }));
      const { error: insertSplitsError } = await db.insertTransactionSplits(
        splitRows
      );

      if (insertSplitsError) {
        return res.status(500).json({ error: insertSplitsError.message });
      }
    }

    if (split_operation?.action === "update") {
      const { error: splitError } = await db.updateTransactionSplitAmounts(
        split_operation.rows
      );

      if (splitError) {
        return res.status(500).json({ error: splitError.message });
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

    const response = { ...updated, payer_name: payerName };
    const { data: responseWithSplitPercentages, error: splitsError } =
      await attachSplitPercentages(db, [response]);

    if (splitsError) {
      return res.status(500).json({ error: splitsError.message });
    }

    return res.json(responseWithSplitPercentages[0]);
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
