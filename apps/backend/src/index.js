const express = require("express");
const cors = require("cors");

const { createDataAdapter } = require("./data");
const { createRealtimeBus } = require("./realtime");
const {
  scheduleSnapshots,
  resolveSnapshotPath,
  getSnapshotStatus,
  DEFAULT_SNAPSHOT_INTERVAL_MS,
} = require("./snapshot");

const { PORT = 4000, CORS_ORIGIN } = process.env;

const app = express();
const realtimeBus = createRealtimeBus();
let db = null;
let dbMode = null;
app.use(cors({ origin: CORS_ORIGIN || "*" }));
app.use(express.json());

app.get("/realtime", (req, res) => {
  const tablesParam = req.query.tables;
  const tables = Array.isArray(tablesParam)
    ? tablesParam
    : typeof tablesParam === "string"
      ? tablesParam.split(",")
      : [];

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  if (typeof res.flushHeaders === "function") {
    res.flushHeaders();
  }

  const send = (payload) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  send({ type: "connected" });

  const unsubscribe = realtimeBus.subscribe(tables, send);
  const keepAlive = setInterval(() => {
    res.write(": ping\n\n");
  }, 25000);

  req.on("close", () => {
    clearInterval(keepAlive);
    unsubscribe();
    res.end();
  });
});

app.get("/changes", async (req, res) => {
  if (!db || typeof db.getChangesSince !== "function") {
    return res.status(500).json({ error: "Database not ready." });
  }

  const sinceParam = req.query.since;
  const since = Number(sinceParam ?? 0);

  if (Number.isNaN(since) || since < 0) {
    return res.status(400).json({ error: "Since cursor must be a non-negative number." });
  }

  const tablesParam = req.query.tables;
  const tables = Array.isArray(tablesParam)
    ? tablesParam
    : typeof tablesParam === "string"
      ? tablesParam.split(",")
      : [];
  const normalizedTables = tables
    .map((table) => String(table || "").trim())
    .filter((table) => table.length > 0);

  const { latest_id, has_changes, error } = await db.getChangesSince({
    since,
    tables: normalizedTables,
  });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({
    latest_id: latest_id || 0,
    has_changes: Boolean(has_changes),
  });
});

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

const getProfileCount = async () => {
  if (!db) {
    return { count: 0, error: { message: "Database not ready." } };
  }

  return db.getProfileCount();
};

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
  const response = {
    status: "ok",
    database: dbMode,
  };

  if (dbMode === "local") {
    response.snapshot = getSnapshotStatus();
  }

  res.json(response);
});

app.get("/profiles", async (_req, res) => {
  const { data, error } = await db.listProfiles();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json(data);
});

app.post("/profiles/setup", async (req, res) => {
  const { profiles } = req.body || {};

  if (!Array.isArray(profiles) || profiles.length !== 2) {
    return res.status(400).json({ error: "Exactly two profiles are required." });
  }

  const { count, error: countError } = await getProfileCount();

  if (countError) {
    return res.status(500).json({ error: countError.message });
  }

  if (count > 0) {
    return res.status(400).json({ error: "Profiles already exist." });
  }

  const { error: splitsClearError } = await db.clearTransactionSplits();

  if (splitsClearError) {
    return res.status(500).json({ error: splitsClearError.message });
  }

  const { error: transactionsClearError } = await db.clearTransactions();

  if (transactionsClearError) {
    return res.status(500).json({ error: transactionsClearError.message });
  }

  const normalizedProfiles = profiles.map((profile) => {
    const displayName = String(profile?.display_name || "").trim();
    const normalizedSplit = Number(profile?.default_split);

    return {
      display_name: displayName,
      default_split: normalizedSplit,
    };
  });

  const hasInvalidName = normalizedProfiles.some(
    (profile) => !profile.display_name
  );
  const hasInvalidSplit = normalizedProfiles.some((profile) => {
    return (
      Number.isNaN(profile.default_split) ||
      profile.default_split <= 0 ||
      profile.default_split >= 1
    );
  });

  if (hasInvalidName || hasInvalidSplit) {
    return res.status(400).json({
      error: "Profiles need a name and split between 0 and 1.",
    });
  }

  const totalSplit = normalizedProfiles.reduce(
    (sum, profile) => sum + profile.default_split,
    0
  );

  if (Math.abs(totalSplit - 1) > 0.001) {
    return res
      .status(400)
      .json({ error: "Default splits must total 1." });
  }

  const { data, error } = await db.insertProfiles(normalizedProfiles);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(201).json({ profiles: data || [] });
});

app.post("/profiles", async (req, res) => {
  const { display_name, default_split } = req.body || {};

  const { count, error: countError } = await getProfileCount();

  if (countError) {
    return res.status(500).json({ error: countError.message });
  }

  if (count >= 2) {
    return res.status(400).json({ error: "Only two profiles are supported." });
  }

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

  const { data, error } = await db.insertProfile({
    display_name,
    default_split: normalizedSplit,
  });

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

  const { error } = await db.updateProfile(profileId, updates);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ id: profileId });
});

app.get("/transactions", async (req, res) => {
  const { type, category, month } = req.query || {};

  let startDate = null;
  let endDate = null;

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

    startDate = start.toISOString().slice(0, 10);
    endDate = end.toISOString().slice(0, 10);
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
    new Set(transactions.map((transaction) => transaction.payer_id).filter(Boolean))
  );

  let profilesById = new Map();

  if (payerIds.length > 0) {
    const { data: profiles, error: profileError } = await db.listProfilesByIds(payerIds);

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

  const { data: profiles, error: profilesError } = await db.listProfiles();

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

  const { data: transactions, error: transactionsError } =
    await db.listTransactionsSince(fromDate);

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
    const { data: splits, error: splitsError } =
      await db.listTransactionSplitsByTransactionIds(customIds);

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

  const { data: transaction, error: transactionError } = await db.insertTransaction({
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

    const { error: splitsError } = await db.insertTransactionSplits(splitRows);

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

  const shouldUpdateSplits =
    existing.type === "EXPENSE" && updated.split_mode === "custom";

  if (shouldUpdateSplits && amount !== undefined) {
    const { data: splits, error: splitsError } =
      await db.listTransactionSplitsByTransactionId(transactionId);

    if (splitsError) {
      return res.status(500).json({ error: splitsError.message });
    }

    if (splits && splits.length > 0) {
      const total = splits.reduce((sum, split) => sum + Number(split.amount || 0), 0);

      if (total > 0) {
        // Calculate proportions (percentages) from current split amounts
        const proportions = splits.map(split => (Number(split.amount || 0) / total) * 100);
        const allocatedAmounts = allocateAmount(updated.amount, proportions);

        const splitUpdates = splits.map((split, index) => ({
          id: split.id,
          amount: allocatedAmounts[index],
        }));
        const { error: splitError } =
          await db.updateTransactionSplitAmounts(splitUpdates);

        if (splitError) {
          return res.status(500).json({ error: splitError.message });
        }
      }
    }
  }

  let payerName = null;

  if (updated.payer_id) {
    const { data: profiles, error: profileError } = await db.listProfilesByIds([
      updated.payer_id,
    ]);

    if (profileError) {
      return res.status(500).json({ error: profileError.message });
    }

    payerName = profiles && profiles[0] ? profiles[0].display_name : null;
  }

  return res.json({ ...updated, payer_name: payerName });
});

app.delete("/transactions/:id", async (req, res) => {
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

// ===== CATEGORIES =====

// GET /categories/init - Initialize categories table (run once)
app.get("/categories/init", async (req, res) => {
  // Try to insert default categories (will skip if they already exist due to unique constraint)
  const defaultCategories = [
    { label: "Groceries", icon: "🛒", is_default: true },
    { label: "Rent", icon: "🏠", is_default: true },
    { label: "Utilities", icon: "💡", is_default: true },
    { label: "Restaurants", icon: "🍽️", is_default: true },
    { label: "Transport", icon: "🚗", is_default: true },
    { label: "Health", icon: "🩺", is_default: true },
    { label: "Entertainment", icon: "🎬", is_default: true },
    { label: "Travel", icon: "✈️", is_default: true },
    { label: "Shopping", icon: "🛍️", is_default: true },
    { label: "Subscriptions", icon: "📦", is_default: true },
    { label: "Salary", icon: "💼", is_default: true },
    { label: "Freelance", icon: "🧑‍💻", is_default: true },
    { label: "Gifts", icon: "🎁", is_default: true },
    { label: "Pets", icon: "🐾", is_default: true },
    { label: "Education", icon: "🎓", is_default: true },
    { label: "Insurance", icon: "🛡️", is_default: true },
    { label: "Home", icon: "🧹", is_default: true },
    { label: "Kids", icon: "🧸", is_default: true },
    { label: "Taxes", icon: "🧾", is_default: true },
    { label: "Other", icon: "🧩", is_default: true },
  ];

  const { data, error } = await db.insertCategoriesIfMissing(defaultCategories);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({
    message: "Categories initialized",
    inserted: data?.length || 0,
    total: defaultCategories.length,
  });
});

// GET /categories - Fetch all categories
app.get("/categories", async (req, res) => {
  const { data, error } = await db.listCategories();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json(data);
});

// POST /categories - Create a new category
app.post("/categories", async (req, res) => {
  const { label, icon } = req.body;

  if (!label || !label.trim()) {
    return res.status(400).json({ error: "Label is required." });
  }

  if (!icon || !icon.trim()) {
    return res.status(400).json({ error: "Icon is required." });
  }

  const { data, error } = await db.insertCategory({
    label: label.trim(),
    icon: icon.trim(),
    is_default: false,
  });

  if (error) {
    if (error.code === "23505") {
      return res.status(400).json({ error: "Category already exists." });
    }
    return res.status(500).json({ error: error.message });
  }

  return res.status(201).json(data);
});

// PATCH /categories/:id - Update a category
app.patch("/categories/:id", async (req, res) => {
  const categoryId = normalizeId(req.params.id);

  if (!categoryId || Number.isNaN(categoryId)) {
    return res.status(400).json({ error: "Invalid category ID." });
  }

  const { label, icon } = req.body;

  if (!label && !icon) {
    return res.status(400).json({ error: "No updates provided." });
  }

  const updates = {};
  if (label) {
    updates.label = label.trim();
  }
  if (icon) {
    updates.icon = icon.trim();
  }

  const { data, error } = await db.updateCategory(categoryId, updates);

  if (error) {
    if (error.code === "23505") {
      return res.status(400).json({ error: "Category label already exists." });
    }
    return res.status(500).json({ error: error.message });
  }

  if (!data) {
    return res.status(404).json({ error: "Category not found." });
  }

  return res.json(data);
});

// DELETE /categories/:id - Delete a category
app.delete("/categories/:id", async (req, res) => {
  const categoryId = normalizeId(req.params.id);

  if (!categoryId || Number.isNaN(categoryId)) {
    return res.status(400).json({ error: "Invalid category ID." });
  }

  // Check if it's a default category
  const { data: existing, error: fetchError } = await db.getCategoryById(categoryId);

  if (fetchError) {
    return res.status(500).json({ error: fetchError.message });
  }

  if (!existing) {
    return res.status(404).json({ error: "Category not found." });
  }

  const { error } = await db.deleteCategory(categoryId);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ id: categoryId });
});

// ===== PERSON MONTHLY SUMMARY =====

// GET /person-monthly-summary - Get monthly financial summary per person
app.get("/person-monthly-summary", async (_req, res) => {
  const { data: profiles, error: profilesError } = await db.listProfiles();

  if (profilesError) {
    return res.status(500).json({ error: profilesError.message });
  }

  const { data: transactions, error: transactionsError } =
    await db.listTimelineTransactions();

  if (transactionsError) {
    return res.status(500).json({ error: transactionsError.message });
  }

  if (!transactions || transactions.length === 0) {
    return res.json({
      profiles: profiles || [],
      monthly_summary: [],
    });
  }

  // Group transactions by month and profile
  const monthlyMap = new Map();

  transactions.forEach((t) => {
    const monthKey = t.date.slice(0, 7); // YYYY-MM

    if (!monthlyMap.has(monthKey)) {
      monthlyMap.set(monthKey, new Map());
    }

    const profileMap = monthlyMap.get(monthKey);

    // Initialize profile entries if not exists
    if (t.payer_id && !profileMap.has(t.payer_id)) {
      profileMap.set(t.payer_id, {
        profile_id: t.payer_id,
        expenses_total: 0,
        income_total: 0,
        liquidations_received_total: 0,
        liquidations_paid_total: 0,
      });
    }

    if (t.beneficiary_id && !profileMap.has(t.beneficiary_id)) {
      profileMap.set(t.beneficiary_id, {
        profile_id: t.beneficiary_id,
        expenses_total: 0,
        income_total: 0,
        liquidations_received_total: 0,
        liquidations_paid_total: 0,
      });
    }

    // Aggregate based on transaction type
    if (t.type === "EXPENSE" && t.payer_id) {
      const profileData = profileMap.get(t.payer_id);
      profileData.expenses_total = roundAmount(
        profileData.expenses_total + Number(t.amount)
      );
    }

    if (t.type === "INCOME" && t.payer_id) {
      const profileData = profileMap.get(t.payer_id);
      profileData.income_total = roundAmount(
        profileData.income_total + Number(t.amount)
      );
    }

    if (t.type === "LIQUIDATION") {
      // Track liquidations received by beneficiary
      if (t.beneficiary_id) {
        const profileData = profileMap.get(t.beneficiary_id);
        profileData.liquidations_received_total = roundAmount(
          profileData.liquidations_received_total + Number(t.amount)
        );
      }
      // Track liquidations paid by payer
      if (t.payer_id) {
        const profileData = profileMap.get(t.payer_id);
        profileData.liquidations_paid_total = roundAmount(
          profileData.liquidations_paid_total + Number(t.amount)
        );
      }
    }
  });

  // Convert to sorted array (newest month first)
  const monthlySummary = Array.from(monthlyMap.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([month, profileMap]) => {
      const profiles = Array.from(profileMap.values()).map((p) => {
        const total_spent = roundAmount(p.expenses_total + p.liquidations_paid_total);
        const total_income = roundAmount(p.income_total + p.liquidations_received_total);
        const net_total = roundAmount(total_income - total_spent);

        return {
          profile_id: p.profile_id,
          expenses_total: p.expenses_total,
          liquidations_paid_total: p.liquidations_paid_total,
          total_spent,
          income_total: p.income_total,
          liquidations_received_total: p.liquidations_received_total,
          total_income,
          net_total,
        };
      });

      return {
        month,
        profiles,
      };
    });

  return res.json({
    profiles: profiles || [],
    monthly_summary: monthlySummary,
  });
});

// ===== TIMELINE =====

// GET /timeline - Get relationship financial timeline with insights and milestones
app.get("/timeline", async (req, res) => {
  // Fetch all transactions ordered by date
  const { data: transactions, error: transactionsError } =
    await db.listTimelineTransactions();

  if (transactionsError) {
    return res.status(500).json({ error: transactionsError.message });
  }

  if (!transactions || transactions.length === 0) {
    return res.json({
      summary: {
        first_transaction_date: null,
        total_transactions: 0,
        total_money_managed: 0,
        months_together: 0,
      },
      insights: {},
      monthly_data: [],
      milestones: [],
    });
  }

  // Calculate summary stats
  const firstTransactionDate = transactions[0].date;
  const lastTransactionDate = transactions[transactions.length - 1].date;
  const totalTransactions = transactions.length;
  const totalMoneyManaged = transactions.reduce(
    (sum, t) => (t.type === "EXPENSE" ? sum + Number(t.amount) : sum),
    0
  );

  const firstDate = new Date(firstTransactionDate);
  const lastDate = new Date(lastTransactionDate);
  const monthsDiff =
    (lastDate.getFullYear() - firstDate.getFullYear()) * 12 +
    (lastDate.getMonth() - firstDate.getMonth()) +
    1;

  // Group transactions by month
  const monthlyMap = new Map();
  transactions.forEach((t) => {
    const monthKey = t.date.slice(0, 7); // YYYY-MM
    if (!monthlyMap.has(monthKey)) {
      monthlyMap.set(monthKey, {
        month: monthKey,
        total_spent: 0,
        transaction_count: 0,
        transactions: [],
      });
    }
    const monthData = monthlyMap.get(monthKey);
    if (t.type === "EXPENSE") {
      monthData.total_spent = roundAmount(
        monthData.total_spent + Number(t.amount)
      );
    }
    monthData.transaction_count++;
    monthData.transactions.push(t);
  });

  const monthlyData = Array.from(monthlyMap.values());

  // Calculate insights
  const categoryCount = {};
  transactions.forEach((t) => {
    if (t.category) {
      categoryCount[t.category] = (categoryCount[t.category] || 0) + 1;
    }
  });

  const mostCommonCategory = Object.entries(categoryCount).sort(
    (a, b) => b[1] - a[1]
  )[0]?.[0] || null;

  const busiestMonth = monthlyData.reduce(
    (max, month) =>
      month.total_spent > max.total_spent ? month : max,
    monthlyData[0]
  );

  const averageMonthlySpending =
    monthlyData.length > 0
      ? roundAmount(
          monthlyData.reduce((sum, m) => sum + m.total_spent, 0) /
            monthlyData.length
        )
      : 0;

  const insights = {
    most_common_category: mostCommonCategory,
    busiest_month: busiestMonth?.month || null,
    busiest_month_amount: busiestMonth?.total_spent || 0,
    average_monthly_spending: averageMonthlySpending,
  };

  // Calculate milestones
  const milestones = [];

  // First transaction
  milestones.push({
    type: "first_transaction",
    date: firstTransactionDate,
    title: "Your financial journey began",
    description: "First transaction recorded",
    icon: "💑",
  });

  // Every 100th transaction
  for (let i = 100; i <= totalTransactions; i += 100) {
    const transaction = transactions[i - 1];
    milestones.push({
      type: "transaction_milestone",
      date: transaction.date,
      title: `${i} transactions together`,
      description: `Reached ${i} shared transactions`,
      icon: "🎯",
    });
  }

  // Largest expense
  const largestExpense = transactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((max, t) => (t.amount > max.amount ? t : max), {
      amount: 0,
      date: null,
    });

  if (largestExpense.date) {
    milestones.push({
      type: "largest_expense",
      date: largestExpense.date,
      title: "Largest expense",
      description: `€${Number(largestExpense.amount).toFixed(2)}`,
      icon: "💰",
    });
  }

  // Sort milestones by date
  milestones.sort((a, b) => new Date(a.date) - new Date(b.date));

  return res.json({
    summary: {
      first_transaction_date: firstTransactionDate,
      total_transactions: totalTransactions,
      total_money_managed: roundAmount(totalMoneyManaged),
      months_together: monthsDiff,
    },
    insights,
    monthly_data: monthlyData,
    milestones,
  });
});

const startServer = async () => {
  const { adapter, mode, pg } = await createDataAdapter({
    emitChange: realtimeBus.emitChange,
  });
  db = adapter;
  dbMode = mode;

  if (mode === "local" && pg) {
    const snapshotPath = String(process.env.PGLITE_SNAPSHOT_PATH || "").trim();
    const resolvedPath = snapshotPath || resolveSnapshotPath(process.env.PGLITE_DATA_DIR);
    scheduleSnapshots({
      pg,
      snapshotPath: resolvedPath,
      intervalMs:
        Number(process.env.PGLITE_SNAPSHOT_INTERVAL_MS) || DEFAULT_SNAPSHOT_INTERVAL_MS,
    });
  }

  app.listen(PORT, () => {
    console.log(`Backend listening on ${PORT} (${mode})`);
  });
};

startServer().catch((error) => {
  console.error("Failed to start backend:", error);
  process.exit(1);
});
