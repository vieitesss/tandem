const express = require("express");
const { normalizeId } = require("../lib/ids");

const createCategoriesRouter = ({ db }) => {
  const router = express.Router();

  // GET /categories/init - Initialize categories table (run once)
  router.get("/categories/init", async (_req, res) => {
    // Try to insert default categories (will skip if they already exist due to unique constraint)
    const defaultCategories = [
      { label: "Groceries", icon: "cart", is_default: true },
      { label: "Rent", icon: "home", is_default: true },
      { label: "Utilities", icon: "bolt", is_default: true },
      { label: "Restaurants", icon: "cart", is_default: true },
      { label: "Transport", icon: "car", is_default: true },
      { label: "Health", icon: "health", is_default: true },
      { label: "Entertainment", icon: "media", is_default: true },
      { label: "Travel", icon: "car", is_default: true },
      { label: "Shopping", icon: "bag", is_default: true },
      { label: "Subscriptions", icon: "box", is_default: true },
      { label: "Salary", icon: "briefcase", is_default: true },
      { label: "Freelance", icon: "briefcase", is_default: true },
      { label: "Gifts", icon: "gift", is_default: true },
      { label: "Pets", icon: "paw", is_default: true },
      { label: "Education", icon: "book", is_default: true },
      { label: "Insurance", icon: "shield", is_default: true },
      { label: "Home", icon: "home", is_default: true },
      { label: "Kids", icon: "smile", is_default: true },
      { label: "Taxes", icon: "receipt", is_default: true },
      { label: "Other", icon: "tag", is_default: true },
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
  router.get("/categories", async (_req, res) => {
    const { data, error } = await db.listCategories();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json(data);
  });

  // POST /categories - Create a new category
  router.post("/categories", async (req, res) => {
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
  router.patch("/categories/:id", async (req, res) => {
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
  router.delete("/categories/:id", async (req, res) => {
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

  return router;
};

module.exports = { createCategoriesRouter };
