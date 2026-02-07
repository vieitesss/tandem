"use client";

import Link from "next/link";

import { AnalysisSecondaryActions } from "../shared/SecondaryNavPresets";
import { InlineMessage, PageHeader, PageShell, SectionCard } from "../shared/PageLayout";
import TransactionsFilters from "./TransactionsFilters";
import TransactionsList from "./TransactionsList";
import TransactionsTotals from "./TransactionsTotals";
import DebtSummaryCard from "./DebtSummaryCard";
import { useDebtSummary } from "./useDebtSummary";
import { useTransactionsData } from "./useTransactionsData";
import { useTransactionsLookups } from "./useTransactionsLookups";
import { useTransactionsViewModel } from "./useTransactionsViewModel";

export default function TransactionsPage() {
  const { debtSummary, debtLine, refreshDebtSummary } = useDebtSummary();
  const { profiles, categories, categoryFilterOptions } = useTransactionsLookups();
  const {
    transactions,
    status,
    filters,
    setFilters,
    monthOptions,
    setAllMonthsSelected,
    hasRealtimeUpdate,
    refreshNow,
    savingId,
    deletingId,
    handleUpdate,
    handleDelete,
  } = useTransactionsData({ onRefreshExtras: refreshDebtSummary });
  const { filteredTransactions, groupedTransactions, totalsByType, presentTypes } =
    useTransactionsViewModel({ transactions, filters });
  const showVisibleTotals =
    status.state === "idle" && filteredTransactions.length > 0;
  const handleFilterChange = (key, value) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  };
  const handleMonthChange = (event) => {
    const nextValue = event.target.value;
    setFilters((current) => ({
      ...current,
      month: nextValue,
    }));
    setAllMonthsSelected(nextValue === "");
  };

  return (
    <PageShell>
      <PageHeader
        title="Transactions"
        description="Review every transaction and filter by month, type, category, or payer."
        currentPage="transactions"
        eyebrow="Ledger"
      >
        <AnalysisSecondaryActions />
      </PageHeader>

      {hasRealtimeUpdate ? (
        <SectionCard className="animate-slide-up p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-cream-300 font-medium">
              New transactions are available.
            </div>
            <button
              className="rounded-full border border-obsidian-600 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-cream-200 transition-colors duration-200 hover:border-cream-500/35 hover:bg-obsidian-900"
              type="button"
              onClick={refreshNow}
            >
              Refresh now
            </button>
          </div>
        </SectionCard>
      ) : null}

      <section
        className={`grid gap-4 ${
          showVisibleTotals ? "xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]" : ""
        }`}
      >
        <DebtSummaryCard
          debtLine={debtLine}
          debtSummary={debtSummary}
          embedded
          fillHeight={showVisibleTotals}
        />
        {showVisibleTotals ? (
          <TransactionsTotals
            presentTypes={presentTypes}
            totalsByType={totalsByType}
            embedded
          />
        ) : null}
      </section>

      <section className="space-y-4">
        <TransactionsFilters
          filters={filters}
          monthOptions={monthOptions}
          profiles={profiles}
          categoryFilterOptions={categoryFilterOptions}
          onFilterChange={handleFilterChange}
          onMonthChange={handleMonthChange}
        />

        {status.state === "loading" ? (
          <InlineMessage tone="muted">Loading transactions...</InlineMessage>
        ) : null}

        {status.state === "error" ? (
          <InlineMessage tone="error">{status.message}</InlineMessage>
        ) : null}

        {status.state === "idle" && filteredTransactions.length === 0 ? (
          <SectionCard className="space-y-3 p-5">
            <InlineMessage tone="muted">No transactions found for these filters.</InlineMessage>
            <Link
              href="/"
              className="inline-flex w-fit items-center rounded-xl border border-cream-500/35 bg-cream-500 px-3.5 py-2 text-sm font-display font-semibold text-white transition-colors duration-200 hover:bg-cream-600"
            >
              Add a transaction
            </Link>
          </SectionCard>
        ) : null}

        <TransactionsList
          groupedTransactions={groupedTransactions}
          profiles={profiles}
          categories={categories}
          savingId={savingId}
          deletingId={deletingId}
          onSave={handleUpdate}
          onDelete={handleDelete}
        />
      </section>
    </PageShell>
  );
}
