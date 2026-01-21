const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  PORT = 4000,
  CORS_ORIGIN,
} = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing Supabase credentials.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const app = express();
app.use(cors({ origin: CORS_ORIGIN || "*" }));
app.use(express.json());

const normalizeId = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const numericId = Number(value);

  if (Number.isNaN(numericId) || numericId <= 0) {
    return Number.NaN;
  }

  return numericId;
};

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
  const splits = percentages.map(percent => 
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

const normalizeDateParam = (value) => {
  if (!value) {
    return null;
  }

  const match = String(value).match(/^\d{4}-\d{2}-\d{2}$/);
  if (!match) {
    return null;
  }

  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
};

const getMonthStart = () => {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return start.toISOString().slice(0, 10);
};

const expenseSplitModes = new Set(["custom", "none", "owed"]);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/profiles", async (_req, res) => {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, default_split")
    .order("display_name", { ascending: true });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json(data);
});

app.post("/profiles", async (req, res) => {
  const { display_name, default_split } = req.body || {};

  if (!display_name) {
    return res.status(400).json({ error: "Display name is required." });
  }

  const normalizedSplit =
    default_split === undefined || default_split === null
      ? 0.5
      : Number(default_split);

  if (Number.isNaN(normalizedSplit) || normalizedSplit <= 0 || normalizedSplit >= 1) {
    return res
      .status(400)
      .json({ error: "Default split must be between 0 and 1." });
  }

  const { data, error } = await supabase
    .from("profiles")
    .insert({
      display_name,
      default_split: normalizedSplit,
    })
    .select("id")
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(201).json({ id: data.id });
});

app.patch("/profiles/:id", async (req, res) => {
  const { id } = req.params;
  const { display_name, default_split } = req.body || {};
  const profileId = normalizeId(id);

  if (!id || Number.isNaN(profileId)) {
    return res.status(400).json({ error: "Profile id must be a number." });
  }

  const updates = {};

  if (display_name !== undefined) {
    updates.display_name = display_name;
  }

  if (default_split !== undefined) {
    const normalizedSplit = Number(default_split);

    if (Number.isNaN(normalizedSplit) || normalizedSplit <= 0 || normalizedSplit >= 1) {
      return res
        .status(400)
        .json({ error: "Default split must be between 0 and 1." });
    }

    updates.default_split = normalizedSplit;
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "No updates provided." });
  }

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", profileId);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ id: profileId });
});

app.get("/transactions", async (req, res) => {
  const { type, category, month } = req.query || {};

  let query = supabase
    .from("transactions")
    .select("id, payer_id, beneficiary_id, split_mode, amount, category, date, note, type")
    .order("date", { ascending: false });

  if (type && type !== "ALL") {
    query = query.eq("type", type);
  }

  if (category && category !== "ALL") {
    query = query.eq("category", category);
  }

  if (month) {
    const match = String(month).match(/^(\d{4})-(\d{2})$/);
    if (!match) {
      return res.status(400).json({ error: "Month must be YYYY-MM." });
    }

    const start = new Date(`${month}-01T00:00:00Z`);
    if (Number.isNaN(start.getTime())) {
      return res.status(400).json({ error: "Invalid month." });
    }

    const end = new Date(start);
    end.setUTCMonth(end.getUTCMonth() + 1);

    query = query
      .gte("date", start.toISOString().slice(0, 10))
      .lt("date", end.toISOString().slice(0, 10));
  }

  const { data: transactions, error } = await query;

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  if (!transactions || transactions.length === 0) {
    return res.json([]);
  }

  const payerIds = Array.from(
    new Set(transactions.map((transaction) => transaction.payer_id).filter(Boolean))
  );

  let profilesById = new Map();

  if (payerIds.length > 0) {
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", payerIds);

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

app.get("/debt-summary", async (req, res) => {
  const { from } = req.query || {};
  const normalizedFrom = normalizeDateParam(from);

  if (from && !normalizedFrom) {
    return res.status(400).json({ error: "From date must be YYYY-MM-DD." });
  }

  const fromDate = normalizedFrom || getMonthStart();

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, display_name")
    .order("display_name", { ascending: true });

  if (profilesError) {
    return res.status(500).json({ error: profilesError.message });
  }

  const profileIds = profiles ? profiles.map((profile) => profile.id) : [];
  const baseEntries = profileIds.map((id) => [id, 0]);
  const expensesByProfile = new Map(baseEntries);
  const customSplitPaidByProfile = new Map(baseEntries);
  const owedTransactionsByProfile = new Map(baseEntries);
  const owedPaidByProfile = new Map(baseEntries);
  const customSplitShareByProfile = new Map(baseEntries);
  const liquidationsByProfile = new Map(baseEntries);
  const liquidationsReceivedByProfile = new Map(baseEntries);
  const owedTransactions = [];
  const liquidationTransactions = [];
  let totalCustomSplitExpenses = 0;

  if (!profiles || profiles.length === 0) {
    return res.json({
      from_date: fromDate,
      profiles: [],
      expenses_by_profile: {},
      custom_split_paid_by_profile: {},
      custom_split_share_by_profile: {},
      total_custom_split_expenses: 0,
      owed_transactions_by_profile: {},
      owed_paid_by_profile: {},
      liquidations_by_profile: {},
      liquidations_received_by_profile: {},
      net_by_profile: {},
      balance: { from_profile_id: null, to_profile_id: null, amount: 0 },
      details: {
        custom_splits: [],
        owed_transactions: [],
        liquidations: [],
      },
    });
  }

  const { data: transactions, error: transactionsError } = await supabase
    .from("transactions")
    .select("id, payer_id, beneficiary_id, split_mode, amount, date, type, note, category")
    .gte("date", fromDate)
    .order("date", { ascending: false });

  if (transactionsError) {
    return res.status(500).json({ error: transactionsError.message });
  }

  const customTransactions = new Map();
  const noteByTransactionId = new Map();
  const categoryByTransactionId = new Map();
  const dateByTransactionId = new Map();

  if (transactions && transactions.length > 0) {
    transactions.forEach((transaction) => {
      if (!transaction || transaction.type === "INCOME") {
        return;
      }

      const payerId = transaction.payer_id;
      const beneficiaryId = transaction.beneficiary_id;
      const amount = roundAmount(transaction.amount);

      if (transaction.note) {
        noteByTransactionId.set(transaction.id, transaction.note);
      }

      if (transaction.category) {
        categoryByTransactionId.set(transaction.id, transaction.category);
      }

      if (transaction.date) {
        dateByTransactionId.set(transaction.id, transaction.date);
      }

      if (transaction.type === "EXPENSE") {
        if (payerId) {
          addAmount(expensesByProfile, payerId, amount);
        }

        if (
          transaction.split_mode === "owed" &&
          payerId &&
          beneficiaryId &&
          payerId !== beneficiaryId
        ) {
          addAmount(owedTransactionsByProfile, beneficiaryId, amount);
          addAmount(owedPaidByProfile, payerId, amount);
          owedTransactions.push({
            id: transaction.id,
            payer_id: payerId,
            beneficiary_id: beneficiaryId,
            amount,
            date: transaction.date,
            note: transaction.note || null,
            category: transaction.category || null,
          });
        }

        if (transaction.split_mode === "custom" && payerId) {
          customTransactions.set(transaction.id, { payerId, amount });
          addAmount(customSplitPaidByProfile, payerId, amount);
          totalCustomSplitExpenses = roundAmount(totalCustomSplitExpenses + amount);
        }
      }

      if (transaction.type === "LIQUIDATION") {
        if (payerId) {
          addAmount(liquidationsByProfile, payerId, amount);
        }

        if (beneficiaryId) {
          addAmount(liquidationsReceivedByProfile, beneficiaryId, amount);
        }

        if (payerId && beneficiaryId) {
          liquidationTransactions.push({
            id: transaction.id,
            payer_id: payerId,
            beneficiary_id: beneficiaryId,
            amount,
            date: transaction.date,
            note: transaction.note || null,
          });
        }
      }
    });
  }

  const customSplitDetails = [];

  if (customTransactions.size > 0) {
    const customIds = Array.from(customTransactions.keys());
    const { data: splits, error: splitsError } = await supabase
      .from("transaction_splits")
      .select("transaction_id, user_id, amount")
      .in("transaction_id", customIds);

    if (splitsError) {
      return res.status(500).json({ error: splitsError.message });
    }

    if (splits && splits.length > 0) {
      const splitsByTransaction = new Map();

      splits.forEach((split) => {
        const transaction = customTransactions.get(split.transaction_id);
        const userId = split.user_id;

        if (!transaction || !userId) {
          return;
        }

        const amount = roundAmount(split.amount);
        addAmount(customSplitShareByProfile, userId, amount);

        if (!splitsByTransaction.has(split.transaction_id)) {
          splitsByTransaction.set(split.transaction_id, []);
        }

        splitsByTransaction.get(split.transaction_id).push({
          user_id: userId,
          amount,
        });
      });

      Array.from(customTransactions.entries()).forEach(([transactionId, data]) => {
        customSplitDetails.push({
          id: transactionId,
          payer_id: data.payerId,
          amount: data.amount,
          date: dateByTransactionId.get(transactionId) || null,
          note: noteByTransactionId.get(transactionId) || null,
          category: categoryByTransactionId.get(transactionId) || null,
          splits: splitsByTransaction.get(transactionId) || [],
        });
      });
    } else {
      Array.from(customTransactions.entries()).forEach(([transactionId, data]) => {
        customSplitDetails.push({
          id: transactionId,
          payer_id: data.payerId,
          amount: data.amount,
          date: dateByTransactionId.get(transactionId) || null,
          note: noteByTransactionId.get(transactionId) || null,
          category: categoryByTransactionId.get(transactionId) || null,
          splits: [],
        });
      });
    }
  }

  const netByProfile = new Map(
    profileIds.map((profileId) => {
      const net = roundAmount(
        (customSplitPaidByProfile.get(profileId) || 0) +
          (owedPaidByProfile.get(profileId) || 0) +
          (liquidationsByProfile.get(profileId) || 0) -
          ((customSplitShareByProfile.get(profileId) || 0) +
            (owedTransactionsByProfile.get(profileId) || 0) +
            (liquidationsReceivedByProfile.get(profileId) || 0))
      );

      return [profileId, net];
    })
  );

  let balance = { from_profile_id: null, to_profile_id: null, amount: 0 };

  if (profiles.length >= 2) {
    const first = profiles[0];
    const second = profiles[1];
    const firstNet = roundAmount(netByProfile.get(first.id) || 0);
    const amount = roundAmount(Math.abs(firstNet));

    if (amount > 0) {
      if (firstNet > 0) {
        balance = {
          from_profile_id: second.id,
          to_profile_id: first.id,
          amount,
        };
      } else {
        balance = {
          from_profile_id: first.id,
          to_profile_id: second.id,
          amount,
        };
      }
    }
  }

  return res.json({
    from_date: fromDate,
    profiles,
    expenses_by_profile: Object.fromEntries(expensesByProfile),
    custom_split_paid_by_profile: Object.fromEntries(customSplitPaidByProfile),
    custom_split_share_by_profile: Object.fromEntries(customSplitShareByProfile),
    total_custom_split_expenses: totalCustomSplitExpenses,
    owed_transactions_by_profile: Object.fromEntries(owedTransactionsByProfile),
    owed_paid_by_profile: Object.fromEntries(owedPaidByProfile),
    liquidations_by_profile: Object.fromEntries(liquidationsByProfile),
    liquidations_received_by_profile: Object.fromEntries(liquidationsReceivedByProfile),
    net_by_profile: Object.fromEntries(netByProfile),
    balance,
    details: {
      custom_splits: customSplitDetails,
      owed_transactions: owedTransactions,
      liquidations: liquidationTransactions,
    },
  });
});

app.post("/transactions", async (req, res) => {
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

  if (Number.isNaN(normalizedPayerId) || Number.isNaN(normalizedBeneficiaryId)) {
    return res.status(400).json({ error: "Profile ids must be numbers." });
  }

  if (isLiquidation && !normalizedBeneficiaryId) {
    return res
      .status(400)
      .json({ error: "Liquidation requires a beneficiary." });
  }

  if (isIncome && !normalizedBeneficiaryId && !normalizedPayerId) {
    return res.status(400).json({ error: "Income requires a recipient." });
  }

  if (!isIncome && !normalizedPayerId) {
    return res.status(400).json({ error: "Payer is required." });
  }

  if (!isIncome && !isLiquidation && !expenseSplitModes.has(requestedSplitMode)) {
    return res.status(400).json({ error: "Invalid split mode." });
  }

  if (requestedSplitMode === "owed" && !normalizedBeneficiaryId) {
    return res.status(400).json({ error: "Owed expenses need a beneficiary." });
  }

  if (
    requestedSplitMode === "owed" &&
    normalizedBeneficiaryId &&
    normalizedBeneficiaryId === normalizedPayerId
  ) {
    return res.status(400).json({ error: "Owed expenses need another profile." });
  }

  const payerForInsert = isIncome
    ? normalizedBeneficiaryId || normalizedPayerId
    : normalizedPayerId;
  const categoryForInsert = isIncome ? null : category;
  const splitModeForInsert = isIncome || isLiquidation ? "none" : requestedSplitMode;
  const beneficiaryForInsert = isIncome
    ? payerForInsert
    : isLiquidation
      ? normalizedBeneficiaryId
      : requestedSplitMode === "owed"
        ? normalizedBeneficiaryId
        : null;

  const { data: transaction, error: transactionError } = await supabase
    .from("transactions")
    .insert({
      payer_id: payerForInsert,
      beneficiary_id: beneficiaryForInsert,
      split_mode: splitModeForInsert,
      amount,
      category: categoryForInsert,
      date,
      note,
      type,
    })
    .select("id, split_mode")
    .single();

  if (transactionError) {
    return res.status(500).json({ error: transactionError.message });
  }

  const normalizedAmount = Number(amount);

  if (transaction.split_mode === "custom") {
    if (!Array.isArray(splits_percent)) {
      return res.status(400).json({ error: "Split percentages are required." });
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
      return res.status(400).json({ error: "Split percentages must total 100%." });
    }

    const percentages = splits_percent.map(split => Number(split.percent || 0));
    const allocatedAmounts = allocateAmount(normalizedAmount, percentages);

    const splitRows = splits_percent.map((split, index) => {
      return {
        transaction_id: transaction.id,
        user_id: Number(split.user_id),
        amount: allocatedAmounts[index],
      };
    });

    const { error: splitsError } = await supabase
      .from("transaction_splits")
      .insert(splitRows);

    if (splitsError) {
      return res.status(500).json({ error: splitsError.message });
    }
  }

  return res.status(201).json({ id: transaction.id });
});

app.patch("/transactions/:id", async (req, res) => {
  const { id } = req.params;
  const { payer_id, amount, category, date, note, split_mode, beneficiary_id } =
    req.body || {};
  const transactionId = normalizeId(id);

  if (!id || Number.isNaN(transactionId)) {
    return res.status(400).json({ error: "Transaction id must be a number." });
  }

  const { data: existing, error: existingError } = await supabase
    .from("transactions")
    .select("id, type, amount, payer_id, split_mode, beneficiary_id")
    .eq("id", transactionId)
    .single();

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
    if (existing.type !== "INCOME" && !category) {
      return res.status(400).json({ error: "Category is required." });
    }
    updates.category = existing.type === "INCOME" ? null : category;
  }

  if (note !== undefined) {
    updates.note = note ? String(note).trim() : null;
  }

  if (split_mode !== undefined) {
    if (existing.type !== "EXPENSE") {
      return res.status(400).json({ error: "Split mode only applies to expenses." });
    }

    if (!expenseSplitModes.has(split_mode)) {
      return res.status(400).json({ error: "Invalid split mode." });
    }

    if (split_mode === "custom" && existing.split_mode !== "custom") {
      return res.status(400).json({ error: "Custom splits must be edited in the main form." });
    }

    updatedSplitMode = split_mode;
    updates.split_mode = split_mode;

    if (split_mode !== "owed") {
      updatedBeneficiaryId = null;
      updates.beneficiary_id = null;
    }
  }

  if (beneficiary_id !== undefined) {
    if (existing.type !== "EXPENSE") {
      return res.status(400).json({ error: "Beneficiary only applies to expenses." });
    }

    const normalizedBeneficiaryId = normalizeId(beneficiary_id);

    if (Number.isNaN(normalizedBeneficiaryId)) {
      return res.status(400).json({ error: "Beneficiary must be a number." });
    }

    if (updatedSplitMode !== "owed" && normalizedBeneficiaryId) {
      return res.status(400).json({ error: "Beneficiary only applies to owed." });
    }

    updatedBeneficiaryId = normalizedBeneficiaryId;
    updates.beneficiary_id = normalizedBeneficiaryId;
  }

  if (
    updatedSplitMode !== "owed" &&
    (updatedBeneficiaryId || updates.beneficiary_id)
  ) {
    updatedBeneficiaryId = null;
    updates.beneficiary_id = null;
  }

  if (updatedSplitMode === "owed" && !updatedBeneficiaryId) {
    return res.status(400).json({ error: "Owed expenses need a beneficiary." });
  }

  if (
    updatedSplitMode === "owed" &&
    updatedBeneficiaryId &&
    updatedBeneficiaryId === updatedPayerId
  ) {
    return res.status(400).json({ error: "Owed expenses need another profile." });
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "No updates provided." });
  }

  const { data: updated, error: updateError } = await supabase
    .from("transactions")
    .update(updates)
    .eq("id", transactionId)
    .select("id, payer_id, beneficiary_id, split_mode, amount, category, date, note, type")
    .single();

  if (updateError) {
    return res.status(500).json({ error: updateError.message });
  }

  if (
    existing.type === "EXPENSE" &&
    existing.split_mode === "custom" &&
    updated.split_mode !== "custom"
  ) {
    const { error: deleteError } = await supabase
      .from("transaction_splits")
      .delete()
      .eq("transaction_id", transactionId);

    if (deleteError) {
      return res.status(500).json({ error: deleteError.message });
    }
  }

  const shouldUpdateSplits =
    existing.type === "EXPENSE" && updated.split_mode === "custom";

  if (shouldUpdateSplits && amount !== undefined) {
    const { data: splits, error: splitsError } = await supabase
      .from("transaction_splits")
      .select("id, user_id, amount")
      .eq("transaction_id", transactionId);

    if (splitsError) {
      return res.status(500).json({ error: splitsError.message });
    }

    if (splits && splits.length > 0) {
      const total = splits.reduce((sum, split) => sum + Number(split.amount || 0), 0);

      if (total > 0) {
        // Calculate proportions (percentages) from current split amounts
        const proportions = splits.map(split => (Number(split.amount || 0) / total) * 100);
        const allocatedAmounts = allocateAmount(updated.amount, proportions);

        const splitUpdates = splits.map((split, index) => {
          return supabase
            .from("transaction_splits")
            .update({ amount: allocatedAmounts[index] })
            .eq("id", split.id);
        });

        const splitResults = await Promise.all(splitUpdates);
        const splitError = splitResults.find((result) => result.error);

        if (splitError) {
          return res.status(500).json({ error: splitError.error.message });
        }
      }
    }
  }

  let payerName = null;

  if (updated.payer_id) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", updated.payer_id)
      .single();

    if (profileError) {
      return res.status(500).json({ error: profileError.message });
    }

    payerName = profile ? profile.display_name : null;
  }

  return res.json({ ...updated, payer_name: payerName });
});

app.delete("/transactions/:id", async (req, res) => {
  const { id } = req.params;
  const transactionId = normalizeId(id);

  if (!id || Number.isNaN(transactionId)) {
    return res.status(400).json({ error: "Transaction id must be a number." });
  }

  const { data: existing, error: existingError } = await supabase
    .from("transactions")
    .select("id")
    .eq("id", transactionId)
    .single();

  if (existingError) {
    return res.status(500).json({ error: existingError.message });
  }

  if (!existing) {
    return res.status(404).json({ error: "Transaction not found." });
  }

  const { error: splitsError } = await supabase
    .from("transaction_splits")
    .delete()
    .eq("transaction_id", transactionId);

  if (splitsError) {
    return res.status(500).json({ error: splitsError.message });
  }

  const { error: deleteError } = await supabase
    .from("transactions")
    .delete()
    .eq("id", transactionId);

  if (deleteError) {
    return res.status(500).json({ error: deleteError.message });
  }

  return res.json({ id: transactionId });
});

app.listen(PORT, () => {
  console.log(`Backend listening on ${PORT}`);
});
