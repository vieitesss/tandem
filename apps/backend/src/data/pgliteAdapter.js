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

  const logChange = async (tableName, rowId, action) => {
    try {
      const { rows } = await pg.query(
        "INSERT INTO changes (table_name, row_id, action) VALUES ($1, $2, $3) RETURNING id",
        [tableName, rowId ?? null, action]
      );
      return rows?.[0]?.id ?? null;
    } catch (error) {
      console.warn(
        `Failed to log change for ${tableName}: ${error?.message || "Unknown error"}`
      );
      return null;
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
      await logChange("profiles", null, "insert");
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
      const profileId = rows?.[0]?.id ?? null;
      await logChange("profiles", profileId, "insert");
      notify("profiles");
      return { data: rows?.[0] ?? null, error: null };
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
      await logChange("profiles", id, "update");
      notify("profiles");
      return { error: null };
    } catch (error) {
      return { error: normalizeError(error) };
    }
  };

  const clearTransactionSplits = async () => {
    try {
      await pg.query("DELETE FROM transaction_splits");
      await logChange("transaction_splits", null, "delete");
      notify("transaction_splits");
      return { error: null };
    } catch (error) {
      return { error: normalizeError(error) };
    }
  };

  const clearTransactions = async () => {
    try {
      await pg.query("DELETE FROM transactions");
      await logChange("transactions", null, "delete");
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

  const getLatestTransactionMonth = async () => {
    try {
      const { rows } = await pg.query(
        "SELECT to_char(max(date), 'YYYY-MM') AS latest_month FROM transactions"
      );
      const latestMonth = rows?.[0]?.latest_month || null;
      return { data: latestMonth, error: null };
    } catch (error) {
      return { data: null, error: normalizeError(error) };
    }
  };

  const listTransactionMonths = async () => {
    try {
      const { rows } = await pg.query(
        "SELECT DISTINCT to_char(date, 'YYYY-MM') AS month FROM transactions ORDER BY month DESC"
      );
      const months = Array.isArray(rows)
        ? rows.map((row) => row.month).filter(Boolean)
        : [];
      return { data: months, error: null };
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
      const transactionId = rows?.[0]?.id ?? null;
      await logChange("transactions", transactionId, "insert");
      notify("transactions");
      return { data: normalizeRowDates(rows?.[0]) ?? null, error: null };
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
      return { data: normalizeRowDates(rows?.[0]) ?? null, error: null };
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
      await logChange("transactions", id, "update");
      notify("transactions");
      return { data: rows?.[0] ?? null, error: null };
    } catch (error) {
      return { data: null, error: normalizeError(error) };
    }
  };

  const deleteTransaction = async (id) => {
    try {
      await pg.query("DELETE FROM transactions WHERE id = $1", [id]);
      await logChange("transactions", id, "delete");
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
      await logChange("transaction_splits", null, "insert");
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
      await logChange("transaction_splits", null, "update");
      notify("transaction_splits");
      return { error: null };
    } catch (error) {
      return { error: normalizeError(error) };
    }
  };

  const deleteTransactionSplitsByTransactionId = async (id) => {
    try {
      await pg.query("DELETE FROM transaction_splits WHERE transaction_id = $1", [id]);
      await logChange("transaction_splits", null, "delete");
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

      await logChange("categories", rows?.[0]?.id ?? null, "insert");
      notify("categories");
      return { data: rows[0] || null, error: null };
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
      const updatedCategory = rows?.[0] ?? null;
      if (updatedCategory) {
        await logChange("categories", updatedCategory.id ?? id, "update");
      }
      notify("categories");
      return { data: updatedCategory, error: null };
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
      return { data: rows?.[0] ?? null, error: null };
    } catch (error) {
      return { data: null, error: normalizeError(error) };
    }
  };

  const deleteCategory = async (id) => {
    try {
      await pg.query("DELETE FROM categories WHERE id = $1", [id]);
      await logChange("categories", id, "delete");
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
        await logChange("categories", null, "insert");
        notify("categories");
      }
      return { data: rows, error: null };
    } catch (error) {
      return { data: null, error: normalizeError(error) };
    }
  };

  const getChangesSince = async ({ since, tables }) => {
    const normalizedSince = Number(since || 0);
    if (Number.isNaN(normalizedSince) || normalizedSince < 0) {
      return {
        latest_id: 0,
        has_changes: false,
        error: normalizeError("Invalid since cursor."),
      };
    }

    try {
      const tableFilters = [];
      const tableParams = [];

      if (tables && tables.length > 0) {
        tableParams.push(tables);
        tableFilters.push(`table_name = ANY($${tableParams.length}::text[])`);
      }

      const latestQuery = `SELECT MAX(id)::bigint AS latest_id FROM changes${
        tableFilters.length ? ` WHERE ${tableFilters.join(" AND ")}` : ""
      }`;
      const { rows: latestRows } = await pg.query(latestQuery, tableParams);
      const latestId = latestRows?.[0]?.latest_id
        ? Number(latestRows[0].latest_id)
        : 0;

      const changeFilters = ["id > $1"];
      const changeParams = [normalizedSince];

      if (tables && tables.length > 0) {
        changeParams.push(tables);
        changeFilters.push(`table_name = ANY($${changeParams.length}::text[])`);
      }

      const changeQuery = `SELECT 1 FROM changes WHERE ${changeFilters.join(
        " AND "
      )} LIMIT 1`;
      const { rows: changeRows } = await pg.query(changeQuery, changeParams);
      const hasChanges = Array.isArray(changeRows) && changeRows.length > 0;

      return { latest_id: latestId, has_changes: hasChanges, error: null };
    } catch (error) {
      return { latest_id: 0, has_changes: false, error: normalizeError(error) };
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

module.exports = { createPgliteAdapter, normalizeError };
