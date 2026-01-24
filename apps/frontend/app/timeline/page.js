"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import InsightCard from "../shared/InsightCard";
import IconLinkButton from "../shared/IconLinkButton";
import { fetchJson } from "../shared/api";
import { useRealtimeUpdates } from "../shared/useRealtimeUpdates";
import TimelineViz from "./TimelineViz";
import Tooltip from "../shared/Tooltip";
import { formatCurrency, formatMonthLabel, formatShortDate } from "../shared/format";

const emptyTimeline = {
  summary: null,
  insights: null,
  monthly_data: [],
  milestones: [],
};

export default function TimelinePage() {
  const [timeline, setTimeline] = useState(emptyTimeline);
  const [status, setStatus] = useState("loading");

  const apiBaseUrl = "/api";

  const fetchTimeline = useCallback(() => {
    setStatus("loading");
    return fetchJson(`${apiBaseUrl}/timeline`)
      .then(({ data }) => {
        setTimeline({
          summary: data?.summary || null,
          insights: data?.insights || null,
          monthly_data: Array.isArray(data?.monthly_data) ? data.monthly_data : [],
          milestones: Array.isArray(data?.milestones) ? data.milestones : [],
        });
        setStatus("idle");
      })
      .catch(() => {
        setStatus("error");
      });
  }, [apiBaseUrl]);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  useRealtimeUpdates({
    tables: ["transactions", "transaction_splits"],
    onRefresh: fetchTimeline,
    channelName: "timeline-updates",
  });

  const monthCards = useMemo(() => {
    return timeline.monthly_data.map((month) => ({
      ...month,
      label: formatMonthLabel(month.month),
    }));
  }, [timeline.monthly_data]);

  const milestones = timeline.milestones || [];

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 pt-8 pb-[calc(6rem+env(safe-area-inset-bottom))] md:p-8 md:pt-12">
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
                Timeline
              </p>
              <h1 className="text-3xl font-display font-semibold tracking-tight text-cream-50 md:text-4xl">
                Your financial journey
              </h1>
            </div>
          </div>
          <div className="hidden items-center gap-2 text-cream-300 md:flex">
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
          Highlights, milestones, and shared spending moments
        </p>
      </header>

      {status === "error" ? (
        <p className="text-sm text-coral-300 font-medium">Unable to load timeline.</p>
      ) : null}

      {status === "loading" ? (
        <p className="text-sm text-cream-100/60 font-medium">Loading timeline...</p>
      ) : null}

      {status === "idle" && timeline.summary ? (
        <section className="grid gap-4 md:grid-cols-4 animate-slide-up stagger-1">
          <InsightCard
            label="months together"
            value={timeline.summary.months_together}
            helper={`Since ${formatShortDate(timeline.summary.first_transaction_date)}`}
          />
          <InsightCard
            label="transactions"
            value={timeline.summary.total_transactions}
            helper="Shared moments recorded"
          />
          <InsightCard
            label={
              <div className="flex items-center gap-1.5">
                <span>total managed</span>
                <Tooltip label="Sum of all shared expenses. Excludes internal transfers like liquidations or income to reflect actual outward spending." />
              </div>
            }
            value={formatCurrency(timeline.summary.total_money_managed)}
            helper="Across all expenses"
          />
          <InsightCard
            label="avg monthly"
            value={formatCurrency(timeline.insights?.average_monthly_spending || 0)}
            helper="Typical monthly spend"
          />
        </section>
      ) : null}

      {status === "idle" && timeline.monthly_data.length > 0 ? (
        <section className="rounded-2xl border border-cream-500/15 bg-obsidian-800/40 p-6 shadow-card backdrop-blur-sm animate-slide-up stagger-2">
           <h2 className="mb-6 text-xl font-display font-semibold text-cream-50 tracking-tight">
            Spending History
          </h2>
          <TimelineViz monthlyData={timeline.monthly_data} />
        </section>
      ) : null}

      {status === "idle" && timeline.insights ? (
        <section className="grid gap-4 md:grid-cols-3 animate-slide-up stagger-3">
          <InsightCard
            label="Top category"
            value={timeline.insights.most_common_category || "—"}
            helper="Most frequent spending"
          />
          <InsightCard
            label="Busiest month"
            value={timeline.insights.busiest_month ? formatMonthLabel(timeline.insights.busiest_month) : "—"}
            helper={timeline.insights.busiest_month_amount ? formatCurrency(timeline.insights.busiest_month_amount) : ""}
          />
          <InsightCard
            label="Milestones"
            value={milestones.length}
            helper="Moments worth celebrating"
          />
        </section>
      ) : null}

      {status === "idle" ? (
        <section className="grid gap-6 lg:grid-cols-[1.3fr_1fr] animate-slide-up stagger-3">
          <div className="rounded-2xl border border-cream-500/15 bg-obsidian-800/40 p-6 shadow-card backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-display font-semibold text-cream-50 tracking-tight">
                Monthly story
              </h2>
              <span className="text-xs text-cream-100/60 font-medium">
                {monthCards.length} months
              </span>
            </div>
            <div className="mt-6 space-y-4">
              {monthCards.length === 0 ? (
                <p className="text-sm text-cream-100/60 font-medium">No months yet.</p>
              ) : (
                monthCards.map((month) => (
                  <div
                    key={month.month}
                    className="rounded-2xl border border-cream-500/10 bg-obsidian-900/60 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-cream-50">
                        {month.label}
                      </p>
                      <p className="text-sm font-mono font-semibold text-cream-50">
                        {formatCurrency(month.total_spent)}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-cream-100/60 font-medium">
                      {month.transaction_count} transactions
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-cream-500/15 bg-obsidian-800/40 p-6 shadow-card backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-display font-semibold text-cream-50 tracking-tight">
                Milestones
              </h2>
              <span className="text-xs text-cream-100/60 font-medium">
                {milestones.length} total
              </span>
            </div>
            <div className="mt-6 space-y-4">
              {milestones.length === 0 ? (
                <p className="text-sm text-cream-100/60 font-medium">No milestones yet.</p>
              ) : (
                milestones.map((milestone) => (
                  <div
                    key={`${milestone.type}-${milestone.date}`}
                    className="rounded-2xl border border-cream-500/10 bg-obsidian-900/60 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{milestone.icon}</span>
                      <div>
                        <p className="text-sm font-semibold text-cream-50">
                          {milestone.title}
                        </p>
                        <p className="text-xs text-cream-100/60 font-medium">
                          {formatShortDate(milestone.date)} · {milestone.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
