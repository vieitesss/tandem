const CATEGORY_ICON_KEY_BY_LABEL = {
  groceries: "cart",
  rent: "home",
  utilities: "bolt",
  restaurants: "cart",
  transport: "car",
  health: "health",
  entertainment: "media",
  travel: "car",
  shopping: "bag",
  subscriptions: "box",
  salary: "briefcase",
  freelance: "briefcase",
  gifts: "gift",
  pets: "paw",
  education: "book",
  insurance: "shield",
  home: "home",
  kids: "smile",
  taxes: "receipt",
  other: "tag",
  "date night": "gift",
  "weekend trip": "car",
};

const normalizeText = (value) => String(value || "").trim().toLowerCase();

const toError = (error, fallback) => {
  if (!error) {
    return new Error(fallback);
  }

  if (error instanceof Error) {
    return error;
  }

  if (typeof error === "string") {
    return new Error(error);
  }

  return new Error(error.message || fallback);
};

const getErrorMessage = (error, fallback) => {
  if (!error) {
    return fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return error.message || fallback;
};

const migrateCategoryIconsToSemanticKeys = async ({ db }) => {
  const { data: categories, error } = await db.listCategories();

  if (error) {
    throw toError(error, "Failed to load categories.");
  }

  let updatedCount = 0;

  for (const category of categories || []) {
    const label = normalizeText(category.label);
    const targetIcon = CATEGORY_ICON_KEY_BY_LABEL[label];

    if (!targetIcon) {
      continue;
    }

    const currentIcon = normalizeText(category.icon);

    if (currentIcon === targetIcon) {
      continue;
    }

    const { error: updateError } = await db.updateCategory(category.id, {
      icon: targetIcon,
    });

    if (updateError) {
      throw toError(
        updateError,
        `Failed to update category ${category.id} icon during migration.`
      );
    }

    updatedCount += 1;
  }

  return { updated_count: updatedCount };
};

const MIGRATIONS = [
  {
    id: "20260206_category_icons_semantic_keys",
    description: "Normalize default category icons to semantic keys.",
    sql_file: "apps/backend/sql/migrations/20260206_category_icons_semantic_keys.sql",
    run: migrateCategoryIconsToSemanticKeys,
  },
];

const runPendingMigrations = async ({ db, logger = console }) => {
  if (
    !db ||
    typeof db.listAppliedMigrations !== "function" ||
    typeof db.markMigrationApplied !== "function"
  ) {
    throw new Error("Database adapter does not support migrations.");
  }

  const { data: appliedMigrationIds, error: listError } =
    await db.listAppliedMigrations();

  if (listError) {
    logger.warn(
      `Could not read applied migrations. Proceeding with idempotent migration execution: ${getErrorMessage(listError, "Unknown error")}`
    );
  }

  const appliedSet = new Set(listError ? [] : appliedMigrationIds || []);
  const applied = [];

  for (const migration of MIGRATIONS) {
    if (appliedSet.has(migration.id)) {
      continue;
    }

    logger.log(
      `Running migration ${migration.id}: ${migration.description} (${migration.sql_file})`
    );
    const details = await migration.run({ db, logger });

    const { error: markError } = await db.markMigrationApplied(migration.id);
    if (markError) {
      logger.warn(
        `Migration ${migration.id} applied but could not be recorded: ${getErrorMessage(markError, "Unknown error")}`
      );
    }

    applied.push({ id: migration.id, description: migration.description, details });
    logger.log(`Applied migration ${migration.id}.`);
  }

  return { applied, total: MIGRATIONS.length };
};

module.exports = { MIGRATIONS, runPendingMigrations };
