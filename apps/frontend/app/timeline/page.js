"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { AnalysisSecondaryActions } from "../shared/SecondaryNavPresets";
import { API_BASE_PATH, fetchJson } from "../shared/api";
import { formatCurrency, formatMonthLabel, formatShortDate } from "../shared/format";
import { InlineMessage, PageHeader, PageShell, SectionCard } from "../shared/PageLayout";
import SelectField from "../shared/SelectField";
import { useRealtimeUpdates } from "../shared/useRealtimeUpdates";
import TimelineViz from "./TimelineViz";

const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

export default function TimelinePage() {
  const [timeline, setTimeline] = useState({ latest_month: null, monthly_data: [] });
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [status, setStatus] = useState("loading");

  const fetchTimeline = useCallback(() => {
    setStatus("loading");
    return fetchJson(`${API_BASE_PATH}/timeline`)
      .then(({ data }) => {
        const monthlyData = Array.isArray(data?.monthly_data) ? data.monthly_data : [];
        setTimeline({
          latest_month: data?.latest_month || null,
          monthly_data: monthlyData,
        });
        setSelectedMonth((current) =>
          monthlyData.some((entry) => entry.month === current)
            ? current
            : monthlyData.at(-1)?.month || currentMonth()
        );
        setStatus("idle");
      })
      .catch(() => setStatus("error"));
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

  const selectedIndex = timeline.monthly_data.findIndex(
    (entry) => entry.month === selectedMonth
  );
  const selected = timeline.monthly_data[selectedIndex];
  const previous = selectedIndex > 0 ? timeline.monthly_data[selectedIndex - 1] : null;
  const trendData = showAllHistory
    ? timeline.monthly_data
    : timeline.monthly_data.slice(-12);
  const spendingChange = selected && previous
    ? selected.total_spent - previous.total_spent
    : 0;
  const spendingChangePercent = previous?.total_spent
    ? Math.round((spendingChange / previous.total_spent) * 100)
    : null;
  const topCategory = selected?.categories?.[0] || null;
  const monthOptions = useMemo(
    () => [...timeline.monthly_data].reverse(),
    [timeline.monthly_data]
  );

  return (
    <PageShell>
      <PageHeader
        title="Insights"
        description="Understand your household spending one month at a time."
        eyebrow="Analysis"
        currentPage="transactions"
      >
        <AnalysisSecondaryActions />
      </PageHeader>

      {status === "error" ? (
        <InlineMessage tone="error">Unable to load insights.</InlineMessage>
      ) : null}
      {status === "loading" ? (
        <InlineMessage tone="muted">Loading insights...</InlineMessage>
      ) : null}

      {status === "idle" && timeline.monthly_data.length === 0 ? (
        <SectionCard className="p-5">
          <InlineMessage tone="muted">Add an expense to start seeing insights.</InlineMessage>
        </SectionCard>
      ) : null}

      {status === "idle" && timeline.monthly_data.length > 0 ? (
        <>
          <section className="flex flex-wrap items-center gap-2" aria-label="Choose insight month">
            <button
              type="button"
              className="min-h-11 rounded-xl border border-obsidian-600 px-4 text-sm font-semibold text-cream-200 disabled:opacity-40"
              disabled={selectedIndex <= 0}
              onClick={() => setSelectedMonth(timeline.monthly_data[selectedIndex - 1]?.month)}
              aria-label="Previous month"
            >
              ←
            </button>
            <SelectField
              className="min-h-11 flex-1 appearance-none rounded-xl border border-obsidian-600 bg-obsidian-800 px-3 pr-9 text-sm font-semibold text-cream-100 sm:max-w-xs"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              aria-label="Selected month"
            >
              {monthOptions.map((entry) => (
                <option key={entry.month} value={entry.month}>
                  {formatMonthLabel(entry.month)}
                </option>
              ))}
            </SelectField>
            <button
              type="button"
              className="min-h-11 rounded-xl border border-obsidian-600 px-4 text-sm font-semibold text-cream-200 disabled:opacity-40"
              disabled={selectedIndex < 0 || selectedIndex >= timeline.monthly_data.length - 1}
              onClick={() => setSelectedMonth(timeline.monthly_data[selectedIndex + 1]?.month)}
              aria-label="Next month"
            >
              →
            </button>
          </section>

          {selected && selected.total_spent === 0 ? (
            <SectionCard className="space-y-3 p-5">
              <h2 className="text-xl font-display font-semibold text-cream-50">
                No spending in {formatMonthLabel(selected.month)}
              </h2>
              {timeline.latest_month && timeline.latest_month !== selected.month ? (
                <button
                  type="button"
                  className="min-h-11 text-left text-sm font-semibold text-cream-500 underline underline-offset-4"
                  onClick={() => setSelectedMonth(timeline.latest_month)}
                >
                  View {formatMonthLabel(timeline.latest_month)}, the latest month with data
                </button>
              ) : null}
            </SectionCard>
          ) : selected ? (
            <>
              <section className="grid gap-3 sm:grid-cols-3">
                <SectionCard className="p-5 sm:col-span-1">
                  <p className="text-sm font-medium text-cream-300">Household spending</p>
                  <p className="mt-2 text-3xl font-display font-semibold text-cream-50">
                    {formatCurrency(selected.total_spent)}
                  </p>
                  <p className="mt-2 text-xs font-medium text-cream-300">
                    {selected.transaction_count} expense{selected.transaction_count === 1 ? "" : "s"}
                  </p>
                </SectionCard>
                <SectionCard className="p-5">
                  <p className="text-sm font-medium text-cream-300">Largest category</p>
                  <p className="mt-2 text-xl font-display font-semibold text-cream-50">
                    {topCategory?.category || "—"}
                  </p>
                  <p className="mt-2 text-xs font-medium text-cream-300">
                    {topCategory ? `${formatCurrency(topCategory.amount)} · ${topCategory.share}% of spending` : "No categorized expenses"}
                  </p>
                </SectionCard>
                <SectionCard className="p-5">
                  <p className="text-sm font-medium text-cream-300">From previous month</p>
                  <p className="mt-2 text-xl font-display font-semibold text-cream-50">
                    {spendingChange === 0 ? "No change" : `${spendingChange > 0 ? "+" : "−"}${formatCurrency(Math.abs(spendingChange))}`}
                  </p>
                  <p className="mt-2 text-xs font-medium text-cream-300">
                    {!previous
                      ? "No previous month available"
                      : spendingChangePercent === null
                        ? "Previous month had no spending"
                        : `${Math.abs(spendingChangePercent)}% ${spendingChangePercent > 0 ? "more" : spendingChangePercent < 0 ? "less" : "change"}`}
                  </p>
                </SectionCard>
              </section>

              <SectionCard className="p-5 sm:p-6">
                <h2 className="text-xl font-display font-semibold text-cream-50">Spending by category</h2>
                <div className="mt-5 space-y-4">
                  {selected.categories.map((entry) => (
                    <div key={entry.category}>
                      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                        <span className="font-semibold text-cream-100">{entry.category}</span>
                        <span className="text-right font-medium text-cream-300">
                          {formatCurrency(entry.amount)} · {entry.share}% · {entry.transaction_count} {entry.transaction_count === 1 ? "expense" : "expenses"}
                        </span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-obsidian-600" aria-hidden>
                        <div className="h-full rounded-full bg-cream-500" style={{ width: `${entry.share}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>

              {selected.largest_shared_expense ? (
                <p className="px-1 text-sm font-medium text-cream-300">
                  Largest shared expense: <span className="font-semibold text-cream-100">{selected.largest_shared_expense.note || selected.largest_shared_expense.category || "Expense"}</span>
                  {" · "}{formatCurrency(selected.largest_shared_expense.amount)} on {formatShortDate(selected.largest_shared_expense.date)}
                </p>
              ) : null}
            </>
          ) : null}

          <SectionCard className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-display font-semibold text-cream-50">Spending trend</h2>
                <p className="mt-1 text-xs font-medium text-cream-300">
                  {showAllHistory ? "All recorded months" : "Latest 12 calendar months"}
                </p>
              </div>
              {timeline.monthly_data.length > 12 ? (
                <button
                  type="button"
                  className="min-h-11 rounded-xl border border-obsidian-600 px-3 text-sm font-semibold text-cream-200"
                  onClick={() => setShowAllHistory((value) => !value)}
                >
                  {showAllHistory ? "Latest 12" : "Show older history"}
                </button>
              ) : null}
            </div>
            <div className="mt-5">
              <TimelineViz monthlyData={trendData} />
            </div>
          </SectionCard>
        </>
      ) : null}
    </PageShell>
  );
}
