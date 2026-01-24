"use client";

import { useMemo, useState } from "react";

import { normalizeNumberInput } from "../shared/inputs";
import StatusMessage from "../shared/StatusMessage";

const initialProfiles = [
  { displayName: "", splitPercent: "50" },
  { displayName: "", splitPercent: "50" },
];

export default function ProfileSetup({ onComplete }) {
  const [profiles, setProfiles] = useState(initialProfiles);
  const [status, setStatus] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasTriedSubmit, setHasTriedSubmit] = useState(false);

  const apiBaseUrl = "/api";

  const parsePercent = (value) => {
    const normalized = Number(value);
    if (Number.isNaN(normalized) || normalized <= 0 || normalized >= 100) {
      return null;
    }
    return normalized;
  };

  const splitValues = useMemo(
    () => profiles.map((profile) => parsePercent(profile.splitPercent)),
    [profiles]
  );

  const totalSplit = splitValues.reduce(
    (sum, value) => sum + Number(value || 0),
    0
  );
  const hasInvalidName = profiles.some((profile) => !profile.displayName.trim());
  const hasInvalidSplit = splitValues.some((value) => value === null);
  const hasInvalidTotal = Math.abs(totalSplit - 100) > 0.1;
  const canSubmit = !hasInvalidName && !hasInvalidSplit && !hasInvalidTotal;

  const updateProfile = (index, field, value) => {
    setProfiles((current) =>
      current.map((profile, profileIndex) =>
        profileIndex === index ? { ...profile, [field]: value } : profile
      )
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setHasTriedSubmit(true);
    setStatus(null);

    if (!canSubmit) {
      if (hasInvalidName) {
        setStatus({ tone: "error", message: "Add names for both profiles." });
      } else if (hasInvalidSplit) {
        setStatus({
          tone: "error",
          message: "Splits must be between 0 and 100.",
        });
      } else if (hasInvalidTotal) {
        setStatus({
          tone: "error",
          message: "Split percentages must total 100%.",
        });
      }
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        profiles: profiles.map((profile, index) => ({
          display_name: profile.displayName.trim(),
          default_split: splitValues[index] / 100,
        })),
      };

      const response = await fetch(`${apiBaseUrl}/profiles/setup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(errorBody.error || "Failed to create profiles.");
      }

      setStatus({ tone: "success", message: "Profiles created." });
      setProfiles(initialProfiles);
      setHasTriedSubmit(false);
      onComplete?.();
    } catch (error) {
      setStatus({ tone: "error", message: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const inputClassName = (hasError) =>
    `w-full rounded-lg border bg-obsidian-950/70 px-3 py-2.5 text-sm text-cream-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cream-500/30 ${
      hasError ? "border-coral-400" : "border-cream-500/20 hover:border-cream-500/30"
    }`;

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 pt-8 pb-[calc(6rem+env(safe-area-inset-bottom))] md:p-8 md:pt-12">
      <header className="space-y-4 animate-fade-in">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cream-500/20 to-cream-600/10 border border-cream-500/20 shadow-glow-sm md:h-12 md:w-12">
            <img src="/icon.png" alt="Tandem" className="h-7 w-7 md:h-8 md:w-8" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-cream-100/50 font-semibold">
              First time setup
            </p>
            <h1 className="text-3xl font-display font-semibold tracking-tight text-cream-50 md:text-4xl">
              Create two profiles
            </h1>
          </div>
        </div>
        <p className="text-sm text-cream-100/60 font-medium tracking-wide">
          Tandem works with two partners only. Add both names and how you split shared expenses.
        </p>
      </header>

      <form
        className="space-y-6 rounded-2xl border border-cream-500/15 bg-obsidian-800/40 p-6 shadow-card backdrop-blur-sm animate-slide-up"
        onSubmit={handleSubmit}
      >
        <div className="grid gap-4 md:grid-cols-2">
          {profiles.map((profile, index) => {
            const showNameError =
              hasTriedSubmit && !profile.displayName.trim();
            const showSplitError = hasTriedSubmit && splitValues[index] === null;

            return (
              <div
                key={`profile-${index}`}
                className="space-y-4 rounded-2xl border border-cream-500/10 bg-obsidian-950/40 p-5"
              >
                <div className="text-xs font-bold uppercase tracking-widest text-cream-100/50">
                  Profile {index + 1}
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-cream-100/40">
                    Display name
                  </label>
                  <input
                    className={inputClassName(showNameError)}
                    placeholder="Name"
                    value={profile.displayName}
                    onChange={(event) =>
                      updateProfile(index, "displayName", event.target.value)
                    }
                    aria-invalid={showNameError}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-cream-100/40">
                    Default split %
                  </label>
                  <div className="relative">
                    <input
                      className={`${inputClassName(showSplitError)} pr-9 font-mono`}
                      type="number"
                      step="0.1"
                      placeholder="50"
                      value={profile.splitPercent}
                      onChange={(event) =>
                        updateProfile(
                          index,
                          "splitPercent",
                          normalizeNumberInput(event.target.value)
                        )
                      }
                      aria-invalid={showSplitError}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-cream-100/40">
                      %
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cream-500/10 bg-obsidian-950/40 px-4 py-3 text-sm">
          <span className="text-cream-100/60 font-medium">Total split</span>
          <span
            className={`font-mono font-semibold ${
              hasInvalidTotal && hasTriedSubmit
                ? "text-coral-300"
                : "text-cream-50"
            }`}
          >
            {Number.isNaN(totalSplit) ? "0" : totalSplit.toFixed(1)}%
          </span>
        </div>

        <button
          className="w-full rounded-lg bg-cream-500 px-4 py-3 font-display font-semibold text-obsidian-950 shadow-glow-md transition-all duration-300 hover:bg-cream-400 hover:shadow-glow-lg hover:scale-[1.01] active:scale-[0.98] disabled:opacity-60 disabled:hover:scale-100"
          type="submit"
          disabled={isSaving}
        >
          {isSaving ? "Saving..." : "Create profiles"}
        </button>

        <StatusMessage status={status} />
      </form>
    </main>
  );
}
