"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { fetchJson } from "../shared/api";
import { useRealtimeUpdates } from "../shared/useRealtimeUpdates";
import { formatCurrency, formatMonthLabel } from "../shared/format";
import { InlineMessage, PageHeader, PageShell } from "../shared/PageLayout";

const emptySummary = {
  profiles: [],
  monthly_summary: [],
};

export default function PersonSummaryPage() {
  const [summary, setSummary] = useState(emptySummary);
  const [status, setStatus] = useState("loading");

  const apiBaseUrl = "/api";

  const fetchSummary = useCallback(() => {
    setStatus("loading");
    return fetchJson(`${apiBaseUrl}/person-monthly-summary`)
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
  }, [apiBaseUrl]);

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
      />

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
              className="rounded-3xl border border-obsidian-600/80 bg-obsidian-800 p-6 shadow-card"
            >
              <div className="flex items-center justify-between mb-4">
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

                  return (
                    <div
                      key={profile.profile_id}
                      className="rounded-2xl border border-obsidian-600/70 bg-obsidian-900 p-4 space-y-3"
                    >
                      <div className="text-xs font-bold uppercase tracking-wider text-cream-500/80">
                        {profileName}
                      </div>

                      <div className="space-y-2">
                        {/* Outflows */}
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-cream-100/60">
                            Expenses
                          </span>
                          <span className="text-sm font-mono text-cream-100">
                            {formatCurrency(profile.expenses_total)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-cream-100/60">
                            Liquidations paid
                          </span>
                          <span className="text-sm font-mono text-cream-100">
                            {formatCurrency(profile.liquidations_paid_total)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between border-t border-cream-500/10 pt-2">
                          <span className="text-sm font-semibold text-cream-100">
                            Total spent
                          </span>
                          <span className="text-sm font-mono font-semibold text-cream-50">
                            {formatCurrency(profile.total_spent)}
                          </span>
                        </div>

                        {/* Inflows */}
                        <div className="flex items-center justify-between pt-2">
                          <span className="text-sm text-cream-100/60">
                            Income
                          </span>
                          <span className="text-sm font-mono text-cream-100">
                            {formatCurrency(profile.income_total)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-cream-100/60">
                            Liquidations received
                          </span>
                          <span className="text-sm font-mono text-cream-100">
                            {formatCurrency(profile.liquidations_received_total)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between border-t border-cream-500/10 pt-2">
                          <span className="text-sm font-semibold text-cream-100">
                            Total income
                          </span>
                          <span className="text-sm font-mono font-semibold text-cream-50">
                            {formatCurrency(profile.total_income)}
                          </span>
                        </div>

                        {/* Net */}
                        <div className="flex items-center justify-between border-t border-cream-500/10 pt-2">
                          <span className="text-sm font-semibold text-cream-200">
                            Net
                          </span>
                          <span
                            className={`text-sm font-mono font-bold ${
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
