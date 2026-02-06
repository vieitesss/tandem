"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import InsightCard from "../shared/InsightCard";
import SecondaryActions, { SecondaryLink } from "../shared/SecondaryActions";
import { fetchJson } from "../shared/api";
import { useRealtimeUpdates } from "../shared/useRealtimeUpdates";
import TimelineViz from "./TimelineViz";
import Tooltip from "../shared/Tooltip";
import { formatCurrency, formatMonthLabel, formatShortDate } from "../shared/format";
import { InlineMessage, PageHeader, PageShell, SectionCard } from "../shared/PageLayout";

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
    preserveScroll: true,
  });

  const monthCards = useMemo(() => {
    return timeline.monthly_data.map((month) => ({
      ...month,
      label: formatMonthLabel(month.month),
    }));
  }, [timeline.monthly_data]);

  const milestones = timeline.milestones || [];

  return (
    <PageShell>
      <PageHeader
        title="Timeline"
        description="Highlights, milestones, and shared spending moments."
        eyebrow="Analysis"
        currentPage="transactions"
      >
        <SecondaryActions>
          <SecondaryLink
            href="/transactions"
            label="Overview"
            icon={
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.489 2.386a.75.75 0 00-.978 0L3.01 7.81a.75.75 0 00.48 1.315h.76v6.125a.75.75 0 00.75.75H8.5a.75.75 0 00.75-.75V11h1.5v4.25a.75.75 0 00.75.75H15a.75.75 0 00.75-.75V9.125h.76a.75.75 0 00.48-1.315l-6.5-5.424z" />
              </svg>
            }
          />
          <SecondaryLink
            href="/timeline"
            label="Timeline"
            icon={
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" />
              </svg>
            }
          />
          <SecondaryLink
            href="/person-summary"
            label="Person Summary"
            icon={
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
                <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
              </svg>
            }
          />
          <SecondaryLink
            href="/debt-breakdown"
            label="Debt Breakdown"
            icon={
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
              </svg>
            }
          />
        </SecondaryActions>
      </PageHeader>

      {status === "error" ? (
        <InlineMessage tone="error">Unable to load timeline.</InlineMessage>
      ) : null}

      {status === "loading" ? (
        <InlineMessage tone="muted">Loading timeline...</InlineMessage>
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
        <SectionCard className="animate-slide-up stagger-2 p-6">
           <h2 className="mb-6 text-xl font-display font-semibold text-cream-50 tracking-tight">
            Spending History
          </h2>
          <TimelineViz monthlyData={timeline.monthly_data} />
        </SectionCard>
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
          <SectionCard as="div" className="p-6">
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
                    className="rounded-2xl border border-obsidian-600/70 bg-obsidian-900 p-4"
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
          </SectionCard>

          <SectionCard as="div" className="p-6">
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
                    className="rounded-2xl border border-obsidian-600/70 bg-obsidian-900 p-4"
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
          </SectionCard>
        </section>
      ) : null}
    </PageShell>
  );
}
