const createSupabaseAdapter = ({ supabase, emitChange }) => {
  const notify = (table) => {
    if (typeof emitChange === "function") {
      emitChange(table);
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
      notify("profiles");
    }

    return { error };
  };

  const clearTransactionSplits = async () => {
    const { error } = await supabase.from("transaction_splits").delete().neq("id", 0);

    if (!error) {
      notify("transaction_splits");
    }

    return { error };
  };

  const clearTransactions = async () => {
    const { error } = await supabase.from("transactions").delete().neq("id", 0);

    if (!error) {
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
      notify("transactions");
    }

    return { data, error };
  };

  const deleteTransaction = async (id) => {
    const { error } = await supabase.from("transactions").delete().eq("id", id);

    if (!error) {
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
      notify("categories");
    }

    return { data, error };
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
  };
};

module.exports = { createSupabaseAdapter };
