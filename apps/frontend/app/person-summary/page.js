"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import DesktopHeaderActions from "../shared/DesktopHeaderActions";
import { fetchJson } from "../shared/api";
import { useRealtimeUpdates } from "../shared/useRealtimeUpdates";
import { formatCurrency, formatMonthLabel } from "../shared/format";

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
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 pt-8 pb-[calc(6rem+env(safe-area-inset-bottom))] md:p-8 md:pt-12">
      <header className="space-y-3 animate-fade-in">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="title-icon flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cream-500/20 to-cream-600/10 border border-cream-500/20 shadow-glow-sm md:h-12 md:w-12">
              <img src="/icon.png" alt="Tandem" className="title-icon-media" />
            </div>
            <h1 className="text-3xl font-display font-semibold tracking-tight text-cream-50 md:text-4xl">
              Summary
            </h1>
          </div>
          <DesktopHeaderActions currentPage="" />
        </div>
        <p className="text-sm text-cream-100/60 font-medium tracking-wide">
          Monthly breakdown of spending, income, and net balance per person
        </p>
      </header>

      {status === "error" ? (
        <p className="text-sm text-coral-300 font-medium">
          Unable to load person summary.
        </p>
      ) : null}

      {status === "loading" ? (
        <p className="text-sm text-cream-100/60 font-medium">
          Loading person summary...
        </p>
      ) : null}

      {status === "idle" && monthGroups.length === 0 ? (
        <p className="text-sm text-cream-100/60 font-medium">
          No transaction data available yet.
        </p>
      ) : null}

      {status === "idle" && monthGroups.length > 0 ? (
        <section className="space-y-6 animate-slide-up stagger-1">
          {monthGroups.map((month) => (
            <div
              key={month.month}
              className="rounded-2xl border border-cream-500/15 bg-obsidian-800/40 p-6 shadow-card backdrop-blur-sm"
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
                      className="rounded-2xl border border-cream-500/10 bg-obsidian-900/60 p-4 space-y-3"
                    >
                      <div className="text-xs font-bold uppercase tracking-wider text-cream-500/80">
                        {profileName}
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-cream-100/60">
                            Spent
                          </span>
                          <span className="text-sm font-mono text-cream-100">
                            {formatCurrency(profile.spent_total)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-cream-100/60">
                            Income
                          </span>
                          <span className="text-sm font-mono text-sage-400">
                            {formatCurrency(profile.income_total)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-cream-100/60">
                            Liquidation received
                          </span>
                          <span className="text-sm font-mono text-sage-400">
                            {formatCurrency(profile.liquidation_total)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between border-t border-cream-500/10 pt-2">
                          <span className="text-sm font-semibold text-cream-100">
                            Earned total
                          </span>
                          <span className="text-sm font-mono font-semibold text-cream-50">
                            {formatCurrency(profile.earned_total)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
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
    </main>
  );
}
