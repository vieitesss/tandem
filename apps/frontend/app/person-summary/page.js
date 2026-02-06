"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { AnalysisSecondaryActions } from "../shared/SecondaryNavPresets";
import { API_BASE_PATH, fetchJson } from "../shared/api";
import { useRealtimeUpdates } from "../shared/useRealtimeUpdates";
import { formatCurrency, formatMonthLabel } from "../shared/format";
import { InlineMessage, PageHeader, PageShell } from "../shared/PageLayout";

const emptySummary = {
  profiles: [],
  monthly_summary: [],
};

const avatarToneClass = [
  "bg-cream-500/15 text-cream-100 border border-cream-500/25",
  "bg-sage-600/20 text-sage-100 border border-sage-600/35",
  "bg-coral-600/20 text-coral-100 border border-coral-600/35",
];

const initialsFromName = (value) => {
  if (!value) {
    return "--";
  }

  const parts = String(value)
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return "--";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

export default function PersonSummaryPage() {
  const [summary, setSummary] = useState(emptySummary);
  const [status, setStatus] = useState("loading");

  const fetchSummary = useCallback(() => {
    setStatus("loading");
    return fetchJson(`${API_BASE_PATH}/person-monthly-summary`)
      .then(({ data }) => {
        setSummary({
          profiles: Array.isArray(data?.profiles) ? data.profiles : [],
          monthly_summary: Array.isArray(data?.monthly_summary)
            ? data.monthly_summary
            : [],
        });
        setStatus("idle");
      })
      .catch(() => {
        setStatus("error");
      });
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useRealtimeUpdates({
    tables: ["transactions", "transaction_splits"],
    onRefresh: fetchSummary,
    channelName: "person-summary-updates",
    preserveScroll: true,
  });

  const profilesById = useMemo(() => {
    const map = new Map();
    summary.profiles.forEach((p) => {
      map.set(p.id, p.display_name || `Profile ${p.id}`);
    });
    return map;
  }, [summary.profiles]);

  const monthGroups = useMemo(() => {
    return summary.monthly_summary.map((month) => ({
      ...month,
      label: formatMonthLabel(month.month),
    }));
  }, [summary.monthly_summary]);

  return (
    <PageShell>
      <PageHeader
        title="Summary"
        description="Monthly breakdown of spending, income, and net balance per person."
        eyebrow="Analysis"
        currentPage="transactions"
      >
        <AnalysisSecondaryActions />
      </PageHeader>

      {status === "error" ? (
        <InlineMessage tone="error">Unable to load person summary.</InlineMessage>
      ) : null}

      {status === "loading" ? (
        <InlineMessage tone="muted">Loading person summary...</InlineMessage>
      ) : null}

      {status === "idle" && monthGroups.length === 0 ? (
        <InlineMessage tone="muted">No transaction data available yet.</InlineMessage>
      ) : null}

      {status === "idle" && monthGroups.length > 0 ? (
        <section className="space-y-6 animate-slide-up stagger-1">
          {monthGroups.map((month) => (
            <div
              key={month.month}
              className="rounded-3xl border border-obsidian-600/90 bg-obsidian-800 p-5 md:p-6"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-display font-semibold text-cream-50 tracking-tight">
                  {month.label}
                </h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {month.profiles.map((profile) => {
                  const profileName =
                    profilesById.get(profile.profile_id) ||
                    `Profile ${profile.profile_id}`;
                  const isPositive = profile.net_total >= 0;
                  const toneClass =
                    avatarToneClass[Math.abs(Number(profile.profile_id || 0)) % avatarToneClass.length];
                  const avatarLabel = initialsFromName(profileName);

                  return (
                    <div
                      key={profile.profile_id}
                      className="rounded-2xl border border-obsidian-600/90 bg-obsidian-900/50 p-4"
                    >
                      <div className="mb-4 flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-semibold ${toneClass}`}
                          aria-hidden
                        >
                          {avatarLabel}
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cream-400">
                            Person
                          </p>
                          <p className="text-sm font-semibold text-cream-100">{profileName}</p>
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-cream-300">Expenses</span>
                          <span className="text-sm font-mono tabular-nums text-coral-300">
                            {formatCurrency(profile.expenses_total)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-cream-300">
                            Liquidations paid
                          </span>
                          <span className="text-sm font-mono tabular-nums text-cream-200">
                            {formatCurrency(profile.liquidations_paid_total)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between border-t border-obsidian-600 pt-2.5">
                          <span className="text-sm font-semibold text-cream-100">
                            Total spent
                          </span>
                          <span className="text-sm font-mono tabular-nums font-semibold text-coral-200">
                            {formatCurrency(profile.total_spent)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-2.5">
                          <span className="text-sm text-cream-300">
                            Income
                          </span>
                          <span className="text-sm font-mono tabular-nums text-sage-300">
                            {formatCurrency(profile.income_total)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-cream-300">
                            Liquidations received
                          </span>
                          <span className="text-sm font-mono tabular-nums text-cream-200">
                            {formatCurrency(profile.liquidations_received_total)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between border-t border-obsidian-600 pt-2.5">
                          <span className="text-sm font-semibold text-cream-100">
                            Total income
                          </span>
                          <span className="text-sm font-mono tabular-nums font-semibold text-sage-200">
                            {formatCurrency(profile.total_income)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between border-t border-obsidian-600 pt-2.5">
                          <span className="text-sm font-semibold text-cream-200">
                            Net
                          </span>
                          <span
                            className={`text-sm font-mono tabular-nums font-bold ${
                              isPositive ? "text-sage-400" : "text-coral-400"
                            }`}
                          >
                            {formatCurrency(profile.net_total)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      ) : null}
    </PageShell>
  );
}
