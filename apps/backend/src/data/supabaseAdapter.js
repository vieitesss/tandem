const createSupabaseAdapter = ({ supabase, emitChange }) => {
  const notify = (table) => {
    if (typeof emitChange === "function") {
      emitChange(table);
    }
  };

  const logChange = async (tableName, rowId, action) => {
    try {
      const { data, error } = await supabase
        .from("changes")
        .insert({
          table_name: tableName,
          row_id: rowId ?? null,
          action,
        })
        .select("id")
        .single();

      if (error) {
        console.warn(
          `Failed to log change for ${tableName}: ${error.message || "Unknown error"}`
        );
        return null;
      }

      return data?.id ?? null;
    } catch (error) {
      console.warn(
        `Failed to log change for ${tableName}: ${error?.message || "Unknown error"}`
      );
      return null;
    }
  };

  const getProfileCount = async () => {
    const { count, error } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true });

    return { count: count || 0, error };
  };

  const listProfiles = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, default_split")
      .order("display_name", { ascending: true });

    return { data, error };
  };

  const listProfilesByIds = async (ids) => {
    if (!ids || ids.length === 0) {
      return { data: [], error: null };
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", ids);

    return { data, error };
  };

  const insertProfiles = async (profiles) => {
    const { data, error } = await supabase
      .from("profiles")
      .insert(profiles)
      .select("id");

    if (!error) {
      await logChange("profiles", null, "insert");
      notify("profiles");
    }

    return { data, error };
  };

  const insertProfile = async (profile) => {
    const { data, error } = await supabase
      .from("profiles")
      .insert(profile)
      .select("id")
      .single();

    if (!error) {
      await logChange("profiles", data?.id ?? null, "insert");
      notify("profiles");
    }

    return { data, error };
  };

  const updateProfile = async (id, updates) => {
    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", id);

    if (!error) {
      await logChange("profiles", id, "update");
      notify("profiles");
    }

    return { error };
  };

  const clearTransactionSplits = async () => {
    const { error } = await supabase.from("transaction_splits").delete().neq("id", 0);

    if (!error) {
      await logChange("transaction_splits", null, "delete");
      notify("transaction_splits");
    }

    return { error };
  };

  const clearTransactions = async () => {
    const { error } = await supabase.from("transactions").delete().neq("id", 0);

    if (!error) {
      await logChange("transactions", null, "delete");
      notify("transactions");
    }

    return { error };
  };

  const listTransactions = async ({ type, category, startDate, endDate }) => {
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

    if (startDate) {
      query = query.gte("date", startDate);
    }

    if (endDate) {
      query = query.lt("date", endDate);
    }

    const { data, error } = await query;
    return { data, error };
  };

  const getLatestTransactionMonth = async () => {
    const { data, error } = await supabase
      .from("transactions")
      .select("date")
      .order("date", { ascending: false })
      .limit(1);

    if (error) {
      return { data: null, error };
    }

    const latestDate = data?.[0]?.date;
    if (!latestDate) {
      return { data: null, error: null };
    }

    return { data: String(latestDate).slice(0, 7), error: null };
  };

  const listTransactionMonths = async () => {
    const { data, error } = await supabase
      .from("transactions")
      .select("date")
      .order("date", { ascending: false });

    if (error) {
      return { data: null, error };
    }

    const months = new Set();
    data?.forEach((row) => {
      if (row?.date) {
        months.add(String(row.date).slice(0, 7));
      }
    });

    return { data: Array.from(months), error: null };
  };

  const listTransactionsSince = async (fromDate) => {
    const { data, error } = await supabase
      .from("transactions")
      .select("id, payer_id, beneficiary_id, split_mode, amount, date, type, note, category")
      .gte("date", fromDate)
      .order("date", { ascending: false });

    return { data, error };
  };

  const listTimelineTransactions = async () => {
    const { data, error } = await supabase
      .from("transactions")
      .select("id, amount, date, type, category, payer_id, beneficiary_id")
      .order("date", { ascending: true });

    return { data, error };
  };

  const insertTransaction = async (payload) => {
    const { data, error } = await supabase
      .from("transactions")
      .insert(payload)
      .select("id, split_mode")
      .single();

    if (!error) {
      await logChange("transactions", data?.id ?? null, "insert");
      notify("transactions");
    }

    return { data, error };
  };

  const getTransactionById = async (id) => {
    const { data, error } = await supabase
      .from("transactions")
      .select("id, type, amount, payer_id, split_mode, beneficiary_id")
      .eq("id", id)
      .single();

    return { data, error };
  };

  const updateTransaction = async (id, updates) => {
    const { data, error } = await supabase
      .from("transactions")
      .update(updates)
      .eq("id", id)
      .select("id, payer_id, beneficiary_id, split_mode, amount, category, date, note, type")
      .single();

    if (!error) {
      await logChange("transactions", data?.id ?? id, "update");
      notify("transactions");
    }

    return { data, error };
  };

  const deleteTransaction = async (id) => {
    const { error } = await supabase.from("transactions").delete().eq("id", id);

    if (!error) {
      await logChange("transactions", id, "delete");
      notify("transactions");
    }

    return { error };
  };

  const listTransactionSplitsByTransactionIds = async (ids) => {
    if (!ids || ids.length === 0) {
      return { data: [], error: null };
    }

    const { data, error } = await supabase
      .from("transaction_splits")
      .select("transaction_id, user_id, amount")
      .in("transaction_id", ids);

    return { data, error };
  };

  const listTransactionSplitsByTransactionId = async (id) => {
    const { data, error } = await supabase
      .from("transaction_splits")
      .select("id, user_id, amount")
      .eq("transaction_id", id);

    return { data, error };
  };

  const insertTransactionSplits = async (rows) => {
    if (!rows || rows.length === 0) {
      return { error: null };
    }

    const { error } = await supabase.from("transaction_splits").insert(rows);

    if (!error) {
      await logChange("transaction_splits", null, "insert");
      notify("transaction_splits");
    }

    return { error };
  };

  const updateTransactionSplitAmounts = async (splits) => {
    if (!splits || splits.length === 0) {
      return { error: null };
    }

    const splitUpdates = splits.map((split) =>
      supabase.from("transaction_splits").update({ amount: split.amount }).eq("id", split.id)
    );
    const results = await Promise.all(splitUpdates);
    const splitError = results.find((result) => result.error);

    if (!splitError) {
      await logChange("transaction_splits", null, "update");
      notify("transaction_splits");
    }

    return { error: splitError ? splitError.error : null };
  };

  const deleteTransactionSplitsByTransactionId = async (id) => {
    const { error } = await supabase
      .from("transaction_splits")
      .delete()
      .eq("transaction_id", id);

    if (!error) {
      await logChange("transaction_splits", null, "delete");
      notify("transaction_splits");
    }

    return { error };
  };

  const listCategories = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("id, label, icon, is_default")
      .order("is_default", { ascending: false })
      .order("label", { ascending: true });

    return { data, error };
  };

  const insertCategory = async (category) => {
    const { data, error } = await supabase
      .from("categories")
      .insert(category)
      .select("id, label, icon, is_default")
      .single();

    if (!error) {
      await logChange("categories", data?.id ?? null, "insert");
      notify("categories");
    }

    return { data, error };
  };

  const updateCategory = async (id, updates) => {
    const { data, error } = await supabase
      .from("categories")
      .update(updates)
      .eq("id", id)
      .select("id, label, icon, is_default")
      .single();

    if (!error) {
      if (data) {
        await logChange("categories", data.id ?? id, "update");
      }
      notify("categories");
    }

    return { data, error };
  };

  const getCategoryById = async (id) => {
    const { data, error } = await supabase
      .from("categories")
      .select("id, is_default")
      .eq("id", id)
      .single();

    return { data, error };
  };

  const deleteCategory = async (id) => {
    const { error } = await supabase.from("categories").delete().eq("id", id);

    if (!error) {
      await logChange("categories", id, "delete");
      notify("categories");
    }

    return { error };
  };

  const insertCategoriesIfMissing = async (categories) => {
    if (!categories || categories.length === 0) {
      return { data: [], error: null };
    }

    const { data, error } = await supabase
      .from("categories")
      .upsert(categories, { onConflict: "label", ignoreDuplicates: true })
      .select("id");

    if (!error && data && data.length > 0) {
      await logChange("categories", null, "insert");
      notify("categories");
    }

    return { data, error };
  };

  const getChangesSince = async ({ since, tables }) => {
    const normalizedSince = Number(since || 0);
    if (Number.isNaN(normalizedSince) || normalizedSince < 0) {
      return {
        latest_id: 0,
        has_changes: false,
        error: { message: "Invalid since cursor." },
      };
    }

    let latestQuery = supabase
      .from("changes")
      .select("id")
      .order("id", { ascending: false })
      .limit(1);

    if (tables && tables.length > 0) {
      latestQuery = latestQuery.in("table_name", tables);
    }

    const { data: latestData, error: latestError } = await latestQuery;
    if (latestError) {
      return { latest_id: 0, has_changes: false, error: latestError };
    }

    const latestId = latestData && latestData[0] ? Number(latestData[0].id || 0) : 0;

    let hasQuery = supabase
      .from("changes")
      .select("id")
      .gt("id", normalizedSince)
      .limit(1);

    if (tables && tables.length > 0) {
      hasQuery = hasQuery.in("table_name", tables);
    }

    const { data: hasData, error: hasError } = await hasQuery;
    if (hasError) {
      return { latest_id: latestId, has_changes: false, error: hasError };
    }

    const hasChanges = Array.isArray(hasData) && hasData.length > 0;
    return { latest_id: latestId, has_changes: hasChanges, error: null };
  };

  return {
    getProfileCount,
    listProfiles,
    listProfilesByIds,
    insertProfiles,
    insertProfile,
    updateProfile,
    clearTransactionSplits,
    clearTransactions,
    listTransactions,
    listTransactionsSince,
    getLatestTransactionMonth,
    listTransactionMonths,
    listTimelineTransactions,
    insertTransaction,
    getTransactionById,
    updateTransaction,
    deleteTransaction,
    listTransactionSplitsByTransactionIds,
    listTransactionSplitsByTransactionId,
    insertTransactionSplits,
    updateTransactionSplitAmounts,
    deleteTransactionSplitsByTransactionId,
    listCategories,
    insertCategory,
    updateCategory,
    getCategoryById,
    deleteCategory,
    insertCategoriesIfMissing,
    getChangesSince,
  };
};

module.exports = { createSupabaseAdapter };
