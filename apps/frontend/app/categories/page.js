"use client";

import { useEffect, useState } from "react";

import EmojiPicker from "../shared/EmojiPicker";
import IconLinkButton from "../shared/IconLinkButton";
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
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 pt-8 pb-[calc(6rem+env(safe-area-inset-bottom))] md:p-8 md:pt-12">
      <header className="space-y-3 animate-fade-in">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="title-icon flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cream-500/20 to-cream-600/10 border border-cream-500/20 shadow-glow-sm md:h-12 md:w-12">
              <img
                src="/icon.png"
                alt="Tandem"
                className="title-icon-media"
              />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-cream-100/50 font-semibold">
                Categories
              </p>
              <h1 className="text-3xl font-display font-semibold tracking-tight text-cream-50 md:text-4xl">
                Personalize your categories
              </h1>
            </div>
          </div>
          <div className="hidden items-center gap-2 text-cream-300 md:flex">
            <IconLinkButton href="/timeline" label="View timeline">
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" />
              </svg>
            </IconLinkButton>
            <IconLinkButton href="/transactions" label="View transactions">
              <svg
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M5 4.75a.75.75 0 00-.75.75v9.5a.75.75 0 00.75.75h10a.75.75 0 00.75-.75V5.5a.75.75 0 00-.75-.75H5zm1.75 2h6.5a.75.75 0 010 1.5h-6.5a.75.75 0 010-1.5zm0 3h6.5a.75.75 0 010 1.5h-6.5a.75.75 0 010-1.5zm0 3h4a.75.75 0 010 1.5h-4a.75.75 0 010-1.5z" />
              </svg>
            </IconLinkButton>
            <IconLinkButton href="/" label="Add transaction">
              <svg
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M10 4.5a.75.75 0 01.75.75v3h3a.75.75 0 010 1.5h-3v3a.75.75 0 01-1.5 0v-3h-3a.75.75 0 010-1.5h3v-3A.75.75 0 0110 4.5z" />
              </svg>
            </IconLinkButton>
            <IconLinkButton href="/profiles" label="Manage profiles">
              <svg
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M10 10a3 3 0 100-6 3 3 0 000 6z" />
                <path d="M4.5 16a5.5 5.5 0 0111 0v.5h-11V16z" />
              </svg>
            </IconLinkButton>
          </div>
        </div>
        <p className="text-sm text-cream-100/60 font-medium tracking-wide">
          Create, edit, or remove categories to match your shared life
        </p>
      </header>

      <form
        className="space-y-4 rounded-2xl border border-cream-500/15 bg-obsidian-800/40 p-6 shadow-card backdrop-blur-sm animate-slide-up stagger-1"
        onSubmit={handleCreate}
      >
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
          className="w-full rounded-lg bg-cream-500 px-4 py-3 font-display font-semibold text-obsidian-950 shadow-glow-md transition-all duration-300 hover:bg-cream-400 hover:shadow-glow-lg"
          type="submit"
        >
          Add Category
        </button>
      </form>

      <section className="space-y-3 animate-slide-up stagger-2">
        <h2 className="text-sm font-display font-semibold text-cream-100 tracking-tight">
          Existing Categories
        </h2>
        {categories.length === 0 ? (
          <p className="text-sm text-cream-100/60 font-medium">No categories yet.</p>
        ) : (
          <div className="space-y-3">
            {categories.map((category) => (
              <div
                key={category.id}
                className="rounded-2xl border border-cream-500/15 bg-obsidian-800/40 p-4 shadow-card backdrop-blur-sm"
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
                      className="rounded-lg bg-cream-500 px-3 py-2 text-xs font-semibold text-obsidian-950 shadow-glow-sm transition-all duration-200 hover:bg-cream-400"
                      onClick={() => handleSave(category)}
                      disabled={savingId === category.id}
                    >
                      {savingId === category.id ? "Saving…" : "Save"}
                    </button>
                    <button
                      type="button"
                      className="rounded-lg bg-coral-500/80 px-3 py-2 text-xs font-semibold text-obsidian-950 transition-all duration-200 hover:bg-coral-500"
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

    </main>
  );
}
