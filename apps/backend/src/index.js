const crypto = require("crypto");
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
      id: crypto.randomUUID(),
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

  if (!id) {
    return res.status(400).json({ error: "Profile id is required." });
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

  const { error } = await supabase.from("profiles").update(updates).eq("id", id);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ id });
});

app.get("/transactions", async (req, res) => {
  const { type, category, month } = req.query || {};

  let query = supabase
    .from("transactions")
    .select("id, payer_id, amount, category, date, note, type")
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

  if (isLiquidation && !beneficiary_id) {
    return res
      .status(400)
      .json({ error: "Liquidation requires a beneficiary." });
  }

  if (isIncome && !beneficiary_id && !payer_id) {
    return res.status(400).json({ error: "Income requires a recipient." });
  }

  if (!isIncome && !payer_id) {
    return res.status(400).json({ error: "Payer is required." });
  }

  const payerForInsert = isIncome ? beneficiary_id || payer_id : payer_id;
  const categoryForInsert = isIncome ? null : category;

  const { data: transaction, error: transactionError } = await supabase
    .from("transactions")
    .insert({
      payer_id: payerForInsert,
      amount,
      category: categoryForInsert,
      date,
      note,
      type,
    })
    .select("id")
    .single();

  if (transactionError) {
    return res.status(500).json({ error: transactionError.message });
  }

  const normalizedAmount = Number(amount);
  const effectiveSplitMode =
    isIncome || isLiquidation ? "none" : split_mode || "custom";

  let splitRows = [];

  if (isLiquidation) {
    splitRows = [
      {
        transaction_id: transaction.id,
        user_id: beneficiary_id,
        amount: Number(normalizedAmount.toFixed(2)),
      },
    ];
  } else if (effectiveSplitMode === "none") {
    splitRows = [
      {
        transaction_id: transaction.id,
        user_id: payerForInsert,
        amount: Number(normalizedAmount.toFixed(2)),
      },
    ];
  } else if (Array.isArray(splits_percent)) {
    const totalPercent = splits_percent.reduce(
      (sum, split) => sum + Number(split.percent || 0),
      0
    );

    const invalidPercent = splits_percent.some(
      (split) => Number(split.percent || 0) <= 0 || !split.user_id
    );

    if (Math.abs(totalPercent - 100) > 0.01 || invalidPercent) {
      return res.status(400).json({ error: "Split percentages must total 100%." });
    }

    splitRows = splits_percent.map((split) => {
      const percent = Number(split.percent || 0);
      return {
        transaction_id: transaction.id,
        user_id: split.user_id,
        amount: Number(((normalizedAmount * percent) / 100).toFixed(2)),
      };
    });
  } else {
    return res.status(400).json({ error: "Split percentages are required." });
  }

  const { error: splitsError } = await supabase
    .from("transaction_splits")
    .insert(splitRows);

  if (splitsError) {
    return res.status(500).json({ error: splitsError.message });
  }

  return res.status(201).json({ id: transaction.id });
});

app.patch("/transactions/:id", async (req, res) => {
  const { id } = req.params;
  const { payer_id, amount, category, date, note } = req.body || {};

  if (!id) {
    return res.status(400).json({ error: "Transaction id is required." });
  }

  const { data: existing, error: existingError } = await supabase
    .from("transactions")
    .select("id, type, amount, payer_id")
    .eq("id", id)
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

  if (payer_id !== undefined) {
    if (!payer_id) {
      return res.status(400).json({ error: "Payer is required." });
    }
    updates.payer_id = payer_id;
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

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "No updates provided." });
  }

  const { data: updated, error: updateError } = await supabase
    .from("transactions")
    .update(updates)
    .eq("id", id)
    .select("id, payer_id, amount, category, date, note, type")
    .single();

  if (updateError) {
    return res.status(500).json({ error: updateError.message });
  }

  if (amount !== undefined || payer_id !== undefined) {
    const { data: splits, error: splitsError } = await supabase
      .from("transaction_splits")
      .select("id, user_id, amount")
      .eq("transaction_id", id);

    if (splitsError) {
      return res.status(500).json({ error: splitsError.message });
    }

    const splitUpdates = [];

    if (amount !== undefined && splits && splits.length > 0) {
      const total = splits.reduce((sum, split) => sum + Number(split.amount || 0), 0);

      if (total > 0) {
        splits.forEach((split) => {
          const ratio = Number(split.amount || 0) / total;
          const nextAmount = Number((updated.amount * ratio).toFixed(2));
          splitUpdates.push(
            supabase
              .from("transaction_splits")
              .update({ amount: nextAmount })
              .eq("id", split.id)
          );
        });
      }
    }

    if (payer_id !== undefined && splits && splits.length === 1) {
      splitUpdates.push(
        supabase
          .from("transaction_splits")
          .update({ user_id: updated.payer_id })
          .eq("id", splits[0].id)
      );
    }

    if (splitUpdates.length > 0) {
      const splitResults = await Promise.all(splitUpdates);
      const splitError = splitResults.find((result) => result.error);

      if (splitError) {
        return res.status(500).json({ error: splitError.error.message });
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

  if (!id) {
    return res.status(400).json({ error: "Transaction id is required." });
  }

  const { data: existing, error: existingError } = await supabase
    .from("transactions")
    .select("id")
    .eq("id", id)
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
    .eq("transaction_id", id);

  if (splitsError) {
    return res.status(500).json({ error: splitsError.message });
  }

  const { error: deleteError } = await supabase
    .from("transactions")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return res.status(500).json({ error: deleteError.message });
  }

  return res.json({ id });
});

app.listen(PORT, () => {
  console.log(`Backend listening on ${PORT}`);
});
