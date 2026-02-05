"use client";

import SecondaryActions, { SecondaryLink } from "../shared/SecondaryActions";
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
        <SecondaryActions>
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

      <SectionCard className="p-4">
        <div
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
        </div>
      </SectionCard>

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
          <InlineMessage tone="muted">No transactions found.</InlineMessage>
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
