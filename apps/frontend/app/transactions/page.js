"use client";

import DesktopHeaderActions from "../shared/DesktopHeaderActions";
import SecondaryActions, { SecondaryLink } from "../shared/SecondaryActions";
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
    <main className="mx-auto flex min-h-[100dvh] max-w-6xl flex-col gap-8 px-6 pt-8 pb-[calc(6rem+env(safe-area-inset-bottom))] md:p-8 md:pt-12">
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
            <h1 className="text-3xl font-display font-semibold tracking-tight text-cream-50 md:text-4xl">Transactions</h1>
          </div>
          <DesktopHeaderActions currentPage="transactions" />
        </div>
        <p className="text-sm text-cream-100/60 font-medium tracking-wide">
          Review every transaction and filter by month, type, category, or payer
        </p>
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
      </header>

      {hasRealtimeUpdate ? (
        <section className="rounded-2xl border border-cream-500/15 bg-obsidian-900/50 p-4 shadow-md md:shadow-card md:backdrop-blur-sm animate-slide-up">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-cream-100/80 font-medium">
              New transactions are available.
            </div>
            <button
              className="rounded-full border border-cream-400/40 bg-cream-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-cream-100/80 transition-colors duration-200 hover:border-cream-300 hover:text-cream-50"
              type="button"
              onClick={refreshNow}
            >
              Refresh now
            </button>
          </div>
        </section>
      ) : null}

      <DebtSummaryCard debtLine={debtLine} debtSummary={debtSummary} />

      <section className="space-y-4">
        {status.state === "idle" && filteredTransactions.length > 0 ? (
          <TransactionsTotals
            presentTypes={presentTypes}
            totalsByType={totalsByType}
          />
        ) : null}

        <TransactionsFilters
          filters={filters}
          monthOptions={monthOptions}
          profiles={profiles}
          categoryFilterOptions={categoryFilterOptions}
          onFilterChange={handleFilterChange}
          onMonthChange={handleMonthChange}
        />

        {status.state === "loading" ? (
          <p className="text-sm text-cream-100/60 font-medium">Loading transactions...</p>
        ) : null}

        {status.state === "error" ? (
          <p className="text-sm text-coral-300 font-medium">{status.message}</p>
        ) : null}

        {status.state === "idle" && filteredTransactions.length === 0 ? (
          <p className="text-sm text-cream-100/40 font-medium">No transactions found.</p>
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
    </main>
  );
}
