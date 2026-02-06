"use client";

import { useCallback, useEffect, useState } from "react";

import InsightCard from "../shared/InsightCard";
import { AnalysisSecondaryActions } from "../shared/SecondaryNavPresets";
import { API_BASE_PATH, fetchJson } from "../shared/api";
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

  const fetchTimeline = useCallback(() => {
    setStatus("loading");
    return fetchJson(`${API_BASE_PATH}/timeline`)
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
  }, []);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  useRealtimeUpdates({
    tables: ["transactions", "transaction_splits"],
    onRefresh: fetchTimeline,
    channelName: "timeline-updates",
    preserveScroll: true,
  });

  const milestones = timeline.milestones || [];

  return (
    <PageShell>
      <PageHeader
        title="Timeline"
        description="Highlights, milestones, and shared spending moments."
        eyebrow="Analysis"
        currentPage="transactions"
      >
        <AnalysisSecondaryActions />
      </PageHeader>

      {status === "error" ? (
        <InlineMessage tone="error">Unable to load timeline.</InlineMessage>
      ) : null}

      {status === "loading" ? (
        <InlineMessage tone="muted">Loading timeline...</InlineMessage>
      ) : null}

      {status === "idle" && timeline.monthly_data.length > 0 ? (
        <SectionCard className="animate-slide-up stagger-2 p-6">
           <h2 className="mb-6 text-xl font-display font-semibold text-cream-50 tracking-tight">
            Spending History
          </h2>
          <TimelineViz monthlyData={timeline.monthly_data} />
        </SectionCard>
      ) : null}

      {status === "idle" && timeline.summary ? (
        <section className="grid grid-cols-2 gap-3 md:grid-cols-3 animate-slide-up stagger-3">
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
          <InsightCard
            label="Top category"
            value={timeline.insights?.most_common_category || "—"}
            helper="Most frequent spending"
          />
          <InsightCard
            label="Busiest month"
            value={timeline.insights?.busiest_month ? formatMonthLabel(timeline.insights.busiest_month) : "—"}
            helper={timeline.insights?.busiest_month_amount ? formatCurrency(timeline.insights.busiest_month_amount) : ""}
          />
        </section>
      ) : null}

      {status === "idle" ? (
        <section className="animate-slide-up stagger-3">
          <SectionCard as="div" className="p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-display font-semibold text-cream-50 tracking-tight">
                Milestones
              </h2>
              <span className="text-xs text-cream-100/60 font-medium">
                {milestones.length} total
              </span>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {milestones.length === 0 ? (
                <p className="text-sm text-cream-100/60 font-medium md:col-span-2">No milestones yet.</p>
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
