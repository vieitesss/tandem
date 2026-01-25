const normalizeError = (error) => {
  if (!error) {
    return null;
  }

  if (typeof error === "string") {
    return { message: error };
  }

  return {
    message: error.message || "Database error",
    code: error.code,
  };
};

const buildInsertValues = (rows, columns) => {
  const params = [];
  const values = rows
    .map((row) => {
      const placeholders = columns.map((column) => {
        params.push(row[column]);
        return `$${params.length}`;
      });
      return `(${placeholders.join(", ")})`;
    })
    .join(", ");

  return { values, params };
};

const buildUpdateFields = (updates) => {
  const columns = Object.keys(updates || {});
  const assignments = columns.map((column, index) => `${column} = $${index + 1}`);
  const params = columns.map((column) => updates[column]);

  return { assignments, params, columns };
};

const normalizeRowDates = (row) => {
  if (!row) {
    return row;
  }

  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => {
      if (value instanceof Date) {
        if (key === "date") {
          return [key, value.toISOString().slice(0, 10)];
        }
        return [key, value.toISOString()];
      }

      return [key, value];
    })
  );
};

const normalizeRows = (rows) => {
  if (!rows) {
    return rows;
  }

  return rows.map(normalizeRowDates);
};

const createPgliteAdapter = ({ pg, emitChange }) => {
  const notify = (table) => {
    if (typeof emitChange === "function") {
      emitChange(table);
    }
  };

  const getProfileCount = async () => {
    try {
      const { rows } = await pg.query("SELECT COUNT(*)::int AS count FROM profiles");
      const count = rows && rows[0] ? Number(rows[0].count || 0) : 0;
      return { count, error: null };
    } catch (error) {
      return { count: 0, error: normalizeError(error) };
    }
  };

  const listProfiles = async () => {
    try {
      const { rows } = await pg.query(
        "SELECT id, display_name, default_split FROM profiles ORDER BY display_name ASC"
      );
      return { data: normalizeRows(rows), error: null };
    } catch (error) {
      return { data: null, error: normalizeError(error) };
    }
  };

  const listProfilesByIds = async (ids) => {
    if (!ids || ids.length === 0) {
      return { data: [], error: null };
    }

    try {
      const { rows } = await pg.query(
        "SELECT id, display_name FROM profiles WHERE id = ANY($1::bigint[])",
        [ids]
      );
      return { data: normalizeRows(rows), error: null };
    } catch (error) {
      return { data: null, error: normalizeError(error) };
    }
  };

  const insertProfiles = async (profiles) => {
    if (!profiles || profiles.length === 0) {
      return { data: [], error: null };
    }

    const { values, params } = buildInsertValues(profiles, [
      "display_name",
      "default_split",
    ]);

    try {
      const { rows } = await pg.query(
        `INSERT INTO profiles (display_name, default_split) VALUES ${values} RETURNING id`,
        params
      );
      notify("profiles");
      return { data: normalizeRows(rows), error: null };
    } catch (error) {
      return { data: null, error: normalizeError(error) };
    }
  };

  const insertProfile = async (profile) => {
    try {
      const { rows } = await pg.query(
        "INSERT INTO profiles (display_name, default_split) VALUES ($1, $2) RETURNING id",
        [profile.display_name, profile.default_split]
      );
      notify("profiles");
      return { data: rows[0] || null, error: null };
    } catch (error) {
      return { data: null, error: normalizeError(error) };
    }
  };

  const updateProfile = async (id, updates) => {
    const { assignments, params } = buildUpdateFields(updates);
    if (!assignments.length) {
      return { error: null };
    }

    try {
      await pg.query(
        `UPDATE profiles SET ${assignments.join(", ")} WHERE id = $${
          assignments.length + 1
        }`,
        [...params, id]
      );
      notify("profiles");
      return { error: null };
    } catch (error) {
      return { error: normalizeError(error) };
    }
  };

  const clearTransactionSplits = async () => {
    try {
      await pg.query("DELETE FROM transaction_splits");
      notify("transaction_splits");
      return { error: null };
    } catch (error) {
      return { error: normalizeError(error) };
    }
  };

  const clearTransactions = async () => {
    try {
      await pg.query("DELETE FROM transactions");
      notify("transactions");
      return { error: null };
    } catch (error) {
      return { error: normalizeError(error) };
    }
  };

  const listTransactions = async ({ type, category, startDate, endDate }) => {
    const conditions = [];
    const params = [];

    if (type && type !== "ALL") {
      params.push(type);
      conditions.push(`type = $${params.length}`);
    }

    if (category && category !== "ALL") {
      params.push(category);
      conditions.push(`category = $${params.length}`);
    }

    if (startDate) {
      params.push(startDate);
      conditions.push(`date >= $${params.length}`);
    }

    if (endDate) {
      params.push(endDate);
      conditions.push(`date < $${params.length}`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    try {
      const { rows } = await pg.query(
        `SELECT id, payer_id, beneficiary_id, split_mode, amount, category, date, note, type FROM transactions ${
          whereClause
        } ORDER BY date DESC`,
        params
      );
      return { data: normalizeRows(rows), error: null };
    } catch (error) {
      return { data: null, error: normalizeError(error) };
    }
  };

  const listTransactionsSince = async (fromDate) => {
    try {
      const { rows } = await pg.query(
        "SELECT id, payer_id, beneficiary_id, split_mode, amount, date, type, note, category FROM transactions WHERE date >= $1 ORDER BY date DESC",
        [fromDate]
      );
      return { data: normalizeRows(rows), error: null };
    } catch (error) {
      return { data: null, error: normalizeError(error) };
    }
  };

  const listTimelineTransactions = async () => {
    try {
      const { rows } = await pg.query(
        "SELECT id, amount, date, type, category, payer_id, beneficiary_id FROM transactions ORDER BY date ASC"
      );
      return { data: normalizeRows(rows), error: null };
    } catch (error) {
      return { data: null, error: normalizeError(error) };
    }
  };

  const insertTransaction = async (payload) => {
    try {
      const { rows } = await pg.query(
        "INSERT INTO transactions (payer_id, beneficiary_id, split_mode, amount, category, date, note, type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, split_mode",
        [
          payload.payer_id,
          payload.beneficiary_id,
          payload.split_mode,
          payload.amount,
          payload.category,
          payload.date,
          payload.note,
          payload.type,
        ]
      );
      notify("transactions");
      return { data: normalizeRowDates(rows[0]) || null, error: null };
    } catch (error) {
      return { data: null, error: normalizeError(error) };
    }
  };

  const getTransactionById = async (id) => {
    try {
      const { rows } = await pg.query(
        "SELECT id, type, amount, payer_id, split_mode, beneficiary_id FROM transactions WHERE id = $1",
        [id]
      );
      return { data: normalizeRowDates(rows[0]) || null, error: null };
    } catch (error) {
      return { data: null, error: normalizeError(error) };
    }
  };

  const updateTransaction = async (id, updates) => {
    const { assignments, params } = buildUpdateFields(updates);
    if (!assignments.length) {
      return { data: null, error: null };
    }

    try {
      const { rows } = await pg.query(
        `UPDATE transactions SET ${assignments.join(", ")} WHERE id = $${
          assignments.length + 1
        } RETURNING id, payer_id, beneficiary_id, split_mode, amount, category, date, note, type`,
        [...params, id]
      );
      notify("transactions");
      return { data: rows[0] || null, error: null };
    } catch (error) {
      return { data: null, error: normalizeError(error) };
    }
  };

  const deleteTransaction = async (id) => {
    try {
      await pg.query("DELETE FROM transactions WHERE id = $1", [id]);
      notify("transactions");
      return { error: null };
    } catch (error) {
      return { error: normalizeError(error) };
    }
  };

  const listTransactionSplitsByTransactionIds = async (ids) => {
    if (!ids || ids.length === 0) {
      return { data: [], error: null };
    }

    try {
      const { rows } = await pg.query(
        "SELECT transaction_id, user_id, amount FROM transaction_splits WHERE transaction_id = ANY($1::bigint[])",
        [ids]
      );
      return { data: rows, error: null };
    } catch (error) {
      return { data: null, error: normalizeError(error) };
    }
  };

  const listTransactionSplitsByTransactionId = async (id) => {
    try {
      const { rows } = await pg.query(
        "SELECT id, user_id, amount FROM transaction_splits WHERE transaction_id = $1",
        [id]
      );
      return { data: rows, error: null };
    } catch (error) {
      return { data: null, error: normalizeError(error) };
    }
  };

  const insertTransactionSplits = async (rows) => {
    if (!rows || rows.length === 0) {
      return { error: null };
    }

    const { values, params } = buildInsertValues(rows, [
      "transaction_id",
      "user_id",
      "amount",
    ]);

    try {
      await pg.query(
        `INSERT INTO transaction_splits (transaction_id, user_id, amount) VALUES ${values}`,
        params
      );
      notify("transaction_splits");
      return { error: null };
    } catch (error) {
      return { error: normalizeError(error) };
    }
  };

  const updateTransactionSplitAmounts = async (splits) => {
    if (!splits || splits.length === 0) {
      return { error: null };
    }

    try {
      await pg.transaction(async (tx) => {
        for (const split of splits) {
          await tx.query("UPDATE transaction_splits SET amount = $1 WHERE id = $2", [
            split.amount,
            split.id,
          ]);
        }
      });
      notify("transaction_splits");
      return { error: null };
    } catch (error) {
      return { error: normalizeError(error) };
    }
  };

  const deleteTransactionSplitsByTransactionId = async (id) => {
    try {
      await pg.query("DELETE FROM transaction_splits WHERE transaction_id = $1", [id]);
      notify("transaction_splits");
      return { error: null };
    } catch (error) {
      return { error: normalizeError(error) };
    }
  };

  const listCategories = async () => {
    try {
      const { rows } = await pg.query(
        "SELECT id, label, icon, is_default FROM categories ORDER BY is_default DESC, label ASC"
      );
      return { data: rows, error: null };
    } catch (error) {
      return { data: null, error: normalizeError(error) };
    }
  };

  const insertCategory = async (category) => {
    try {
      const { rows } = await pg.query(
        "INSERT INTO categories (label, icon, is_default) VALUES ($1, $2, $3) ON CONFLICT (label) DO NOTHING RETURNING id, label, icon, is_default",
        [category.label, category.icon, category.is_default]
      );

      if (!rows || rows.length === 0) {
        return {
          data: null,
          error: { message: "Category already exists.", code: "23505" },
        };
      }

      notify("categories");
      return { data: rows[0], error: null };
    } catch (error) {
      return { data: null, error: normalizeError(error) };
    }
  };

  const updateCategory = async (id, updates) => {
    const { assignments, params } = buildUpdateFields(updates);
    if (!assignments.length) {
      return { data: null, error: null };
    }

    try {
      const { rows } = await pg.query(
        `UPDATE categories SET ${assignments.join(", ")} WHERE id = $${
          assignments.length + 1
        } RETURNING id, label, icon, is_default`,
        [...params, id]
      );
      notify("categories");
      return { data: rows[0] || null, error: null };
    } catch (error) {
      return { data: null, error: normalizeError(error) };
    }
  };

  const getCategoryById = async (id) => {
    try {
      const { rows } = await pg.query(
        "SELECT id, is_default FROM categories WHERE id = $1",
        [id]
      );
      return { data: rows[0] || null, error: null };
    } catch (error) {
      return { data: null, error: normalizeError(error) };
    }
  };

  const deleteCategory = async (id) => {
    try {
      await pg.query("DELETE FROM categories WHERE id = $1", [id]);
      notify("categories");
      return { error: null };
    } catch (error) {
      return { error: normalizeError(error) };
    }
  };

  const insertCategoriesIfMissing = async (categories) => {
    if (!categories || categories.length === 0) {
      return { data: [], error: null };
    }

    const { values, params } = buildInsertValues(categories, [
      "label",
      "icon",
      "is_default",
    ]);

    try {
      const { rows } = await pg.query(
        `INSERT INTO categories (label, icon, is_default) VALUES ${values} ON CONFLICT (label) DO NOTHING RETURNING id`,
        params
      );
      if (rows && rows.length > 0) {
        notify("categories");
      }
      return { data: rows, error: null };
    } catch (error) {
      return { data: null, error: normalizeError(error) };
    }
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

module.exports = { createPgliteAdapter, normalizeError };
