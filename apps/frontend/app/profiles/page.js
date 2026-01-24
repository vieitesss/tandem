"use client";

import { useCallback, useEffect, useState } from "react";

import { normalizeNumberInput } from "../shared/inputs";
import IconLinkButton from "../shared/IconLinkButton";
import { useToast } from "../shared/ToastProvider";
import ProfileSetup from "./ProfileSetup";

const emptyProfile = { displayName: "", splitPercent: "50" };

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState([]);
  const [form, setForm] = useState(emptyProfile);
  const [savingId, setSavingId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const apiBaseUrl = "/api";
  const { showToast } = useToast();

  const loadProfiles = useCallback(() => {
    setIsLoading(true);
    fetch(`${apiBaseUrl}/profiles`)
      .then((response) => response.json())
      .then((data) => {
        setProfiles(
          Array.isArray(data)
            ? data.map((profile) => ({
                id: profile.id,
                display_name: profile.display_name || "",
                splitPercent: String(
                  Math.round(Number(profile.default_split || 0) * 1000) / 10
                ),
              }))
            : []
        );
        setIsLoading(false);
      })
      .catch(() => {
        setProfiles([]);
        setIsLoading(false);
      });
  }, [apiBaseUrl]);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  const updateProfile = (id, field, value) => {
    setProfiles((current) =>
      current.map((profile) =>
        profile.id === id ? { ...profile, [field]: value } : profile
      )
    );
  };

  const parsePercent = (value) => {
    const normalized = Number(value);
    if (Number.isNaN(normalized) || normalized <= 0 || normalized >= 100) {
      return null;
    }
    return normalized / 100;
  };

  const handleCreate = async (event) => {
    event.preventDefault();

    if (profiles.length >= 2) {
      showToast("Only two profiles are supported.", { tone: "error" });
      return;
    }

    const defaultSplit = parsePercent(form.splitPercent);

    if (!form.displayName.trim() || defaultSplit === null) {
      showToast("Add a name and valid split.", { tone: "error" });
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/profiles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: form.displayName.trim(),
          default_split: defaultSplit,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(errorBody.error || "Failed to create profile");
      }

      setForm(emptyProfile);
      loadProfiles();
      showToast("Profile created.");
    } catch (error) {
      showToast(error.message, { tone: "error" });
    }
  };

  const handleSave = async (profile) => {
    setSavingId(profile.id);

    const defaultSplit = parsePercent(profile.splitPercent);

    if (!profile.display_name.trim() || defaultSplit === null) {
      showToast("Enter name and split 0-100.", { tone: "error" });
      setSavingId(null);
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/profiles/${profile.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: profile.display_name.trim(),
          default_split: defaultSplit,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(errorBody.error || "Failed to update profile");
      }

      showToast("Profile updated.");
      loadProfiles();
    } catch (error) {
      showToast(error.message, { tone: "error" });
    } finally {
      setSavingId(null);
    }
  };

  if (isLoading) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 pt-8 pb-[calc(6rem+env(safe-area-inset-bottom))] md:p-8 md:pt-12">
        <header className="space-y-3 animate-fade-in">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cream-500/20 to-cream-600/10 border border-cream-500/20 shadow-glow-sm md:h-12 md:w-12">
              <img
                src="/icon.png"
                alt="Tandem"
                className="h-7 w-7 md:h-8 md:w-8"
              />
            </div>
            <h1 className="text-3xl font-display font-semibold tracking-tight text-cream-50 md:text-4xl">Profiles</h1>
          </div>
          <p className="text-sm text-cream-100/60 font-medium tracking-wide">
            Loading profiles...
          </p>
        </header>
      </main>
    );
  }

  if (profiles.length === 0) {
    return <ProfileSetup onComplete={loadProfiles} />;
  }

  const hasTooManyProfiles = profiles.length > 2;
  const canAddProfile = profiles.length < 2;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-6 pt-8 pb-[calc(6rem+env(safe-area-inset-bottom))] md:p-8 md:pt-12">
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
            <h1 className="text-3xl font-display font-semibold tracking-tight text-cream-50 md:text-4xl">Profiles</h1>
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
            <IconLinkButton href="/categories" label="Manage categories">
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </IconLinkButton>
          </div>
        </div>
        <p className="text-sm text-cream-100/60 font-medium tracking-wide">
          Manage default split percentages for each partner
        </p>
      </header>

      {hasTooManyProfiles ? (
        <section className="rounded-2xl border border-coral-500/30 bg-coral-500/10 p-5 text-sm text-coral-100 shadow-card">
          This workspace has {profiles.length} profiles. Tandem supports exactly
          two. Remove extras in the database, then refresh the page.
        </section>
      ) : null}

      {canAddProfile ? (
        <form
          className="space-y-3 rounded-2xl border border-cream-500/15 bg-obsidian-800/40 p-6 shadow-card backdrop-blur-sm animate-slide-up stagger-1"
          onSubmit={handleCreate}
        >
          <div className="grid gap-3 sm:grid-cols-[1fr_120px_120px]">
            <input
              className="w-full rounded-lg border border-cream-500/20 bg-obsidian-950/80 px-3 py-2.5 text-cream-50 placeholder:text-cream-100/40 hover:border-cream-500/30 focus:outline-none focus:ring-2 focus:ring-cream-500/30 transition-all duration-200"
              placeholder="Name"
              value={form.displayName}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  displayName: event.target.value,
                }))
              }
            />
            <input
              className="w-full rounded-lg border border-cream-500/20 bg-obsidian-950/80 px-3 py-2.5 text-cream-50 font-mono placeholder:text-cream-100/40 hover:border-cream-500/30 focus:outline-none focus:ring-2 focus:ring-cream-500/30 transition-all duration-200"
              placeholder="Split %"
              type="number"
              step="0.1"
              value={form.splitPercent}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  splitPercent: normalizeNumberInput(event.target.value),
                }))
              }
            />
            <button
              className="rounded-lg bg-cream-500 px-4 py-2.5 font-display font-semibold text-obsidian-950 shadow-glow-md transition-all duration-300 hover:bg-cream-400 hover:shadow-glow-lg hover:scale-[1.02] active:scale-[0.98]"
              type="submit"
            >
              Add
            </button>
          </div>
        </form>
      ) : (
        <section className="rounded-2xl border border-cream-500/15 bg-obsidian-800/40 p-6 text-sm text-cream-100/70 shadow-card">
          {hasTooManyProfiles
            ? "Profile limit exceeded. Remove extras and reload this page."
            : "Two profiles are already set. Edit them below as needed."}
        </section>
      )}

      <section className="space-y-4 animate-slide-up stagger-2">
        <h2 className="text-sm font-display font-semibold text-cream-100 tracking-tight">Existing Profiles</h2>
        {profiles.length === 0 ? (
          <p className="text-sm text-cream-100/60 font-medium">No profiles yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {profiles.map((profile) => (
              <div
                key={profile.id}
                className="group relative space-y-4 rounded-2xl border border-cream-500/15 bg-obsidian-800/40 p-5 shadow-card backdrop-blur-sm transition-all duration-300 hover:border-cream-500/25 hover:shadow-elevated"
              >
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-cream-100/40">
                    Display Name
                  </label>
                  <input
                    className="w-full rounded-lg border border-cream-500/10 bg-obsidian-950/60 px-3 py-2 text-sm text-cream-50 transition-all duration-200 hover:border-cream-500/30 focus:outline-none focus:ring-2 focus:ring-cream-500/30"
                    value={profile.display_name}
                    aria-label="Profile name"
                    onChange={(event) =>
                      updateProfile(profile.id, "display_name", event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-cream-100/40">
                    Default Split %
                  </label>
                  <div className="relative">
                    <input
                      className="w-full rounded-lg border border-cream-500/10 bg-obsidian-950/60 px-3 py-2 pr-9 text-sm text-cream-50 font-mono transition-all duration-200 hover:border-cream-500/30 focus:outline-none focus:ring-2 focus:ring-cream-500/30"
                      type="number"
                      step="0.1"
                      value={profile.splitPercent}
                      aria-label="Default split percent"
                      onChange={(event) =>
                        updateProfile(
                          profile.id,
                          "splitPercent",
                          normalizeNumberInput(event.target.value)
                        )
                      }
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-cream-100/40">
                      %
                    </span>
                  </div>
                </div>
                <button
                  className="w-full flex h-10 items-center justify-center rounded-lg bg-obsidian-700/60 text-xs font-semibold text-cream-200 transition-all duration-300 hover:bg-cream-500 hover:text-obsidian-950 hover:shadow-glow-sm disabled:opacity-50"
                  type="button"
                  onClick={() => handleSave(profile)}
                  disabled={savingId === profile.id}
                >
                  {savingId === profile.id ? (
                    <span className="animate-pulse">Saving...</span>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

    </main>
  );
}
