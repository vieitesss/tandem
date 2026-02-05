"use client";

import { useMemo, useState } from "react";

import { normalizeNumberInput } from "../shared/inputs";
import { PageHeader, PageShell, SectionCard } from "../shared/PageLayout";
import { useToast } from "../shared/ToastProvider";

const initialProfiles = [
  { displayName: "", splitPercent: "50" },
  { displayName: "", splitPercent: "50" },
];

export default function ProfileSetup({ onComplete }) {
  const [profiles, setProfiles] = useState(initialProfiles);
  const [isSaving, setIsSaving] = useState(false);
  const [hasTriedSubmit, setHasTriedSubmit] = useState(false);

  const apiBaseUrl = "/api";
  const { showToast } = useToast();

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

    if (!canSubmit) {
      if (hasInvalidName) {
        showToast("Add names for both profiles.", { tone: "error" });
      } else if (hasInvalidSplit) {
        showToast("Splits must be between 0 and 100.", { tone: "error" });
      } else if (hasInvalidTotal) {
        showToast("Split percentages must total 100%.", { tone: "error" });
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

      showToast("Profiles created.");
      setProfiles(initialProfiles);
      setHasTriedSubmit(false);
      onComplete?.();
    } catch (error) {
      showToast(error.message, { tone: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  const inputClassName = (hasError) =>
    `w-full rounded-lg border bg-obsidian-900 px-3 py-2.5 text-sm text-cream-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cream-500/30 ${
      hasError ? "border-coral-400" : "border-obsidian-600 hover:border-cream-500/30"
    }`;

  return (
    <PageShell maxWidth="max-w-4xl">
      <PageHeader
        title="Create two profiles"
        description="Tandem works with two partners only. Add both names and how you split shared expenses."
        eyebrow="First time setup"
      />

      <SectionCard className="border-coral-300/60 bg-coral-50 p-4 text-xs text-coral-100">
        Creating profiles resets existing transactions in this workspace.
      </SectionCard>

      <SectionCard as="form" className="animate-slide-up space-y-6 p-6" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          {profiles.map((profile, index) => {
            const showNameError =
              hasTriedSubmit && !profile.displayName.trim();
            const showSplitError = hasTriedSubmit && splitValues[index] === null;

            return (
              <div
                key={`profile-${index}`}
                className="space-y-4 rounded-2xl border border-obsidian-600/80 bg-obsidian-900 p-5"
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

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-obsidian-600 bg-obsidian-900 px-4 py-3 text-sm">
          <span className="text-cream-300 font-medium">Total split</span>
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
          className="w-full rounded-lg bg-cream-500 px-4 py-3 font-display font-semibold text-white shadow-glow-md transition-all duration-300 hover:bg-cream-400 hover:shadow-glow-lg hover:scale-[1.01] active:scale-[0.98] disabled:opacity-60 disabled:hover:scale-100"
          type="submit"
          disabled={isSaving}
        >
          {isSaving ? "Saving..." : "Create profiles"}
        </button>

      </SectionCard>
    </PageShell>
  );
}
