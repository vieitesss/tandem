"use client";

import { useEffect, useState } from "react";

import EmojiPicker from "../shared/EmojiPicker";
import { InlineMessage, PageHeader, PageShell, SectionCard } from "../shared/PageLayout";
import SecondaryActions, { SecondaryLink } from "../shared/SecondaryActions";
import { useToast } from "../shared/ToastProvider";

const emptyCategory = { label: "", icon: "" };

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(emptyCategory);
  const [savingId, setSavingId] = useState(null);
  const [activePickerId, setActivePickerId] = useState(null);

  const apiBaseUrl = "/api";
  const { showToast } = useToast();

  const loadCategories = () => {
    fetch(`${apiBaseUrl}/categories`)
      .then((response) => response.json())
      .then((data) => {
        setCategories(Array.isArray(data) ? data : []);
      })
      .catch(() => setCategories([]));
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const updateCategory = (id, field, value) => {
    setCategories((current) =>
      current.map((category) =>
        category.id === id ? { ...category, [field]: value } : category
      )
    );
  };

  const handleCreate = async (event) => {
    event.preventDefault();

    if (!form.label.trim() || !form.icon.trim()) {
      showToast("Add a name and icon.", { tone: "error" });
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: form.label.trim(),
          icon: form.icon.trim(),
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(errorBody.error || "Failed to create category");
      }

      setForm(emptyCategory);
      loadCategories();
      showToast("Category created.");
    } catch (error) {
      showToast(error.message, { tone: "error" });
    }
  };

  const handleSave = async (category) => {
    setSavingId(category.id);

    if (!category.label?.trim() || !category.icon?.trim()) {
      showToast("Enter a name and icon.", { tone: "error" });
      setSavingId(null);
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/categories/${category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: category.label.trim(),
          icon: category.icon.trim(),
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(errorBody.error || "Failed to update category");
      }

      showToast("Category updated.");
      setActivePickerId(null);
      loadCategories();
    } catch (error) {
      showToast(error.message, { tone: "error" });
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (categoryId) => {
    try {
      const response = await fetch(`${apiBaseUrl}/categories/${categoryId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(errorBody.error || "Failed to delete category");
      }

      showToast("Category deleted.");
      loadCategories();
    } catch (error) {
      showToast(error.message, { tone: "error" });
    }
  };

  return (
    <PageShell maxWidth="max-w-4xl">
      <PageHeader
        title="Categories"
        description="Create, edit, or remove categories to match your shared life."
        currentPage="profiles"
        eyebrow="Setup"
      >
        <SecondaryActions>
          <SecondaryLink
            href="/profiles"
            label="Overview"
            icon={
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.489 2.386a.75.75 0 00-.978 0L3.01 7.81a.75.75 0 00.48 1.315h.76v6.125a.75.75 0 00.75.75H8.5a.75.75 0 00.75-.75V11h1.5v4.25a.75.75 0 00.75.75H15a.75.75 0 00.75-.75V9.125h.76a.75.75 0 00.48-1.315l-6.5-5.424z" />
              </svg>
            }
          />
          <SecondaryLink
            href="/categories"
            label="Categories"
            icon={
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            }
          />
        </SecondaryActions>
      </PageHeader>

      <SectionCard as="form" className="animate-slide-up stagger-1 space-y-4 p-6" onSubmit={handleCreate}>
        <div className="grid gap-3 md:grid-cols-[1fr_160px]">
          <input
            className="w-full rounded-lg border border-cream-500/20 bg-obsidian-950/80 px-3 py-2.5 text-cream-50 placeholder:text-cream-100/40 hover:border-cream-500/30 focus:outline-none focus:ring-2 focus:ring-cream-500/30 transition-all duration-200"
            placeholder="Category name"
            value={form.label}
            onChange={(event) =>
              setForm((current) => ({ ...current, label: event.target.value }))
            }
          />
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cream-500/20 bg-obsidian-950/80 text-2xl">
              {form.icon || "✨"}
            </div>
            <span className="text-xs text-cream-100/60 font-medium">
              Pick an icon
            </span>
          </div>
        </div>
        <EmojiPicker value={form.icon} onChange={(icon) => setForm((current) => ({ ...current, icon }))} />
        <button
          className="w-full rounded-lg bg-cream-500 px-4 py-3 font-display font-semibold text-white shadow-glow-md transition-all duration-300 hover:bg-cream-400 hover:shadow-glow-lg"
          type="submit"
        >
          Add Category
        </button>
      </SectionCard>

      <section className="space-y-3 animate-slide-up stagger-2">
        <h2 className="text-sm font-display font-semibold text-cream-100 tracking-tight">
          Existing Categories
        </h2>
        {categories.length === 0 ? (
          <InlineMessage tone="muted">No categories yet.</InlineMessage>
        ) : (
          <div className="space-y-3">
            {categories.map((category) => (
              <div
                key={category.id}
                className="rounded-2xl border border-obsidian-600/80 bg-obsidian-800 p-4 shadow-card"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-cream-500/20 bg-obsidian-950/80 text-2xl transition-all duration-200 hover:border-cream-500/40"
                    onClick={() =>
                      setActivePickerId((current) =>
                        current === category.id ? null : category.id
                      )
                    }
                  >
                    {category.icon}
                  </button>
                  <input
                    className="min-w-[200px] flex-1 rounded-lg border border-cream-500/20 bg-obsidian-950/80 px-3 py-2 text-cream-50 hover:border-cream-500/30 focus:outline-none focus:ring-2 focus:ring-cream-500/30 transition-all duration-200"
                    value={category.label}
                    onChange={(event) =>
                      updateCategory(category.id, "label", event.target.value)
                    }
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="rounded-lg bg-cream-500 px-3 py-2 text-xs font-semibold text-white shadow-glow-sm transition-all duration-200 hover:bg-cream-400"
                      onClick={() => handleSave(category)}
                      disabled={savingId === category.id}
                    >
                      {savingId === category.id ? "Saving…" : "Save"}
                    </button>
                    <button
                      type="button"
                      className="rounded-lg bg-coral-500/80 px-3 py-2 text-xs font-semibold text-white transition-all duration-200 hover:bg-coral-500"
                      onClick={() => handleDelete(category.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                {activePickerId === category.id ? (
                  <div className="mt-4">
                    <EmojiPicker
                      value={category.icon}
                      onChange={(icon) => updateCategory(category.id, "icon", icon)}
                    />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

    </PageShell>
  );
}
