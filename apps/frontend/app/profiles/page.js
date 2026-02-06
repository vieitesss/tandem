"use client";

import { useCallback, useEffect, useState } from "react";

import { normalizeNumberInput } from "../shared/inputs";
import { InlineMessage, PageHeader, PageShell, SectionCard } from "../shared/PageLayout";
import SecondaryActions, { SecondaryLink } from "../shared/SecondaryActions";
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
      <PageShell maxWidth="max-w-3xl">
        <PageHeader
          title="Profiles"
          description="Manage default split percentages for each partner."
          currentPage="profiles"
          eyebrow="Setup"
        />
        <InlineMessage tone="muted">Loading profiles...</InlineMessage>
      </PageShell>
    );
  }

  if (profiles.length === 0) {
    return <ProfileSetup onComplete={loadProfiles} />;
  }

  const hasTooManyProfiles = profiles.length > 2;
  const canAddProfile = profiles.length < 2;

  return (
    <PageShell maxWidth="max-w-3xl">
      <PageHeader
        title="Profiles"
        description="Manage default split percentages for each partner."
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

      {hasTooManyProfiles ? (
        <SectionCard className="border-coral-300/60 bg-coral-50 p-5 text-sm text-coral-100">
          This workspace has {profiles.length} profiles. Tandem supports exactly
          two. Remove extras in the database, then refresh the page.
        </SectionCard>
      ) : null}

      {canAddProfile ? (
        <form
          className="animate-slide-up stagger-1 space-y-3 rounded-3xl border border-obsidian-600/80 bg-obsidian-800 p-6 shadow-card"
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
              className="rounded-lg bg-cream-500 px-4 py-2.5 font-display font-semibold text-white shadow-glow-md transition-all duration-300 hover:bg-cream-400 hover:shadow-glow-lg hover:scale-[1.02] active:scale-[0.98]"
              type="submit"
            >
              Add
            </button>
          </div>
        </form>
      ) : (
        <SectionCard className="p-6 text-sm text-cream-300">
          {hasTooManyProfiles
            ? "Profile limit exceeded. Remove extras and reload this page."
            : "Two profiles are already set. Edit them below as needed."}
        </SectionCard>
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
                className="group relative space-y-4 rounded-2xl border border-obsidian-600/80 bg-obsidian-800 p-5 shadow-card transition-all duration-300 hover:border-cream-500/25 hover:shadow-elevated"
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
                  className="w-full flex h-10 items-center justify-center rounded-lg bg-obsidian-700/60 text-xs font-semibold text-cream-200 transition-all duration-300 hover:bg-cream-500 hover:text-white hover:shadow-glow-sm disabled:opacity-50"
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

    </PageShell>
  );
}
