"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import DesktopHeaderActions from "../shared/DesktopHeaderActions";
import SecondaryActions, { SecondaryLink } from "../shared/SecondaryActions";
import SelectField from "../shared/SelectField";
import Tooltip from "../shared/Tooltip";
import { fetchJson } from "../shared/api";
import { formatCurrency, formatMonthLabel, formatShortDate } from "../shared/format";
import { useRealtimeUpdates } from "../shared/useRealtimeUpdates";
import {
  categoryOptions,
  typeOptions,
} from "../shared/transactions";
import TransactionRow from "./TransactionRow";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [status, setStatus] = useState({ state: "idle", message: "" });
  const [filters, setFilters] = useState({
    month: "",
    type: "ALL",
    category: "All",
    payerId: "",
    split: "ALL",
  });
  const [profiles, setProfiles] = useState([]);
  const [categories, setCategories] = useState(categoryOptions);
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [debtFromDate, setDebtFromDate] = useState(() => {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    return start.toISOString().slice(0, 10);
  });
  const [debtSummary, setDebtSummary] = useState({
    state: "idle",
    message: "",
    data: null,
  });

  const apiBaseUrl = "/api";

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.month) {
      params.set("month", filters.month);
    }
    if (filters.type && filters.type !== "ALL") {
      params.set("type", filters.type);
    }
    if (filters.category && filters.category !== "All") {
      params.set("category", filters.category);
    }
    const query = params.toString();
    return query ? `?${query}` : "";
  }, [filters]);

  const filteredTransactions = useMemo(() => {
    const payerId = filters.payerId ? Number(filters.payerId) : null;

    return transactions.filter((transaction) => {
      if (payerId && transaction.payer_id !== payerId) {
        return false;
      }

      if (filters.split && filters.split !== "ALL") {
        if (transaction.type !== "EXPENSE") {
          return false;
        }

        const splitLabel =
          transaction.split_mode === "none"
            ? "PERSONAL"
            : transaction.split_mode
                ? String(transaction.split_mode).toUpperCase()
                : "";

        if (splitLabel !== filters.split) {
          return false;
        }
      }

      return true;
    });
  }, [filters.payerId, filters.split, transactions]);

  const monthOptions = useMemo(() => {
    const months = new Set();

    transactions.forEach((transaction) => {
      if (transaction.date) {
        months.add(transaction.date.slice(0, 7));
      }
    });

    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [transactions]);

  const groupedTransactions = useMemo(() => {
    const groups = new Map();

    filteredTransactions.forEach((transaction) => {
      const monthKey = transaction.date
        ? transaction.date.slice(0, 7)
        : "unknown";

      if (!groups.has(monthKey)) {
        groups.set(monthKey, []);
      }

      groups.get(monthKey).push(transaction);
    });

    return Array.from(groups.keys())
      .sort((a, b) => b.localeCompare(a))
      .map((month) => ({ month, items: groups.get(month) }));
  }, [filteredTransactions]);

  const fetchTransactions = useCallback(() => {
    setStatus({ state: "loading", message: "" });

    return fetchJson(`${apiBaseUrl}/transactions${queryString}`)
      .then(({ data }) => {
        setTransactions(Array.isArray(data) ? data : []);
        setStatus({ state: "idle", message: "" });
      })
      .catch(() => {
        setStatus({ state: "error", message: "Failed to load transactions." });
        setTransactions([]);
      });
  }, [apiBaseUrl, queryString]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    fetchJson(`${apiBaseUrl}/profiles`)
      .then(({ data }) => {
        setProfiles(Array.isArray(data) ? data : []);
      })
      .catch(() => setProfiles([]));
  }, [apiBaseUrl]);

  useEffect(() => {
    fetchJson(`${apiBaseUrl}/categories`)
      .then(({ data }) => {
        if (Array.isArray(data) && data.length > 0) {
          setCategories(data);
        }
      })
      .catch(() => setCategories(categoryOptions));
  }, [apiBaseUrl]);

  const categoryFilterOptions = useMemo(() => {
    return ["All", ...categories.map((option) => option.label)];
  }, [categories]);

  const fetchDebtSummary = useCallback(() => {
    if (!debtFromDate) {
      return null;
    }

    setDebtSummary({ state: "loading", message: "", data: null });

    return fetchJson(
      `${apiBaseUrl}/debt-summary?from=${encodeURIComponent(debtFromDate)}`
    )
      .then(({ data }) => {
        if (data?.error) {
          setDebtSummary({ state: "error", message: data.error, data: null });
          return;
        }

        setDebtSummary({ state: "idle", message: "", data });
      })
      .catch(() => {
        setDebtSummary({
          state: "error",
          message: "Failed to load debt summary.",
          data: null,
        });
      });
  }, [apiBaseUrl, debtFromDate]);

  useEffect(() => {
    fetchDebtSummary();
  }, [fetchDebtSummary]);

  const refreshAll = useCallback(() => {
    return Promise.all([fetchTransactions(), fetchDebtSummary()]);
  }, [fetchTransactions, fetchDebtSummary]);

  const { hasRealtimeUpdate, refreshNow } = useRealtimeUpdates({
    tables: ["transactions", "transaction_splits"],
    onRefresh: refreshAll,
    channelName: "transactions-updates",
    preserveScroll: true,
  });

  const handleUpdate = async (transactionId, payload) => {
    setSavingId(transactionId);

    try {
      const response = await fetch(`${apiBaseUrl}/transactions/${transactionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update transaction.");
      }

      setTransactions((current) =>
        current.map((transaction) =>
          transaction.id === transactionId ? { ...transaction, ...data } : transaction
        )
      );

      return data;
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (transactionId) => {
    setDeletingId(transactionId);

    try {
      const response = await fetch(`${apiBaseUrl}/transactions/${transactionId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete transaction.");
      }

      setTransactions((current) =>
        current.filter((transaction) => transaction.id !== transactionId)
      );

      return data;
    } finally {
      setDeletingId(null);
    }
  };

  const debtProfiles = debtSummary.data?.profiles || [];
  const debtExpenses = debtSummary.data?.expenses_by_profile || {};
  const debtCustomSplitPaid = debtSummary.data?.custom_split_paid_by_profile || {};
   const debtCustomSplitShare = debtSummary.data?.custom_split_share_by_profile || {};
   const debtCustomSplitTotal = Number(
     debtSummary.data?.total_custom_split_expenses || 0
   );
   const debtOwedTransactions = debtSummary.data?.owed_transactions_by_profile || {};
   const debtOwedPaid = debtSummary.data?.owed_paid_by_profile || {};
   const debtLiquidations = debtSummary.data?.liquidations_by_profile || {};
   const debtLiquidationsReceived =
     debtSummary.data?.liquidations_received_by_profile || {};
   const debtNet = debtSummary.data?.net_by_profile || {};
   const debtBalance = debtSummary.data?.balance || {};
  const debtProfileLabels = debtProfiles.map((profile) => {
    const expenses = Number(debtExpenses[profile.id] || 0);
    const customSplitPaid = Number(debtCustomSplitPaid[profile.id] || 0);
    const customSplitShare = Number(debtCustomSplitShare[profile.id] || 0);
    const owedTransactions = Number(debtOwedTransactions[profile.id] || 0);
    const owedPaid = Number(debtOwedPaid[profile.id] || 0);
    const liquidationsPaid = Number(debtLiquidations[profile.id] || 0);
    const liquidationsReceived = Number(debtLiquidationsReceived[profile.id] || 0);
    const paidTotal = customSplitPaid + owedPaid + liquidationsPaid;
    const toPayTotal = customSplitShare + owedTransactions;
    const receivedTotal = liquidationsReceived;

    return {
      ...profile,
      expenses,
      customSplitPaid,
      customSplitShare,
      owedTransactions,
      owedPaid,
      liquidationsPaid,
      liquidationsReceived,
      paidTotal,
      toPayTotal,
      receivedTotal,
      net: Number(debtNet[profile.id] || 0),
    };
  });


  const debtProfilesById = new Map(
    debtProfiles.map((profile) => [profile.id, profile])
  );
  let debtLine = "All settled up.";

  if (debtSummary.state === "loading") {
    debtLine = "Calculating balances...";
  } else if (debtSummary.state === "error") {
    debtLine = "Unable to calculate debt.";
  } else if (debtBalance?.amount) {
    debtLine = `${
      debtProfilesById.get(debtBalance.from_profile_id)?.display_name ||
      "Partner 1"
    } owed ${formatCurrency(debtBalance.amount)} to ${
      debtProfilesById.get(debtBalance.to_profile_id)?.display_name ||
      "Partner 2"
    }`;
  }

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
        <section className="rounded-2xl border border-cream-500/15 bg-obsidian-900/50 p-4 shadow-card backdrop-blur-sm animate-slide-up">
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

      <section className="space-y-4 rounded-2xl border border-cream-500/15 bg-obsidian-800/40 p-6 shadow-card backdrop-blur-sm animate-slide-up stagger-1">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider text-cream-100/50 font-semibold">
              Debt Summary
            </p>
            <h2 className="text-xl font-display font-semibold text-cream-50 tracking-tight">
              {debtLine}
            </h2>
            <p className="text-xs text-cream-100/60 font-medium">
              From {formatShortDate(debtFromDate)} onward
            </p>
          </div>
          <label className="space-y-2 text-xs font-medium text-cream-200 tracking-wide">
            From date
            <input
              className="w-full min-w-[180px] rounded-lg border border-cream-500/20 bg-obsidian-950/80 px-3 py-2 text-sm text-cream-50 hover:border-cream-500/30 focus:outline-none focus:ring-2 focus:ring-cream-500/30 transition-all duration-200"
              type="date"
              value={debtFromDate}
              onChange={(event) => {
                if (event.target.value) {
                  setDebtFromDate(event.target.value);
                }
              }}
            />
          </label>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-cream-500/15 bg-obsidian-950/40 px-4 py-3 text-sm">
          <span className="text-cream-100/60 font-medium">Total custom split expenses</span>
          <span className="text-cream-50 font-mono font-semibold">{formatCurrency(debtCustomSplitTotal)}</span>
        </div>
        {debtSummary.state === "loading" ? (
          <p className="text-sm text-cream-100/60 font-medium">Loading debt summary...</p>
        ) : null}
        {debtSummary.state === "error" ? (
          <p className="text-sm text-coral-300 font-medium">{debtSummary.message}</p>
        ) : null}
        {debtSummary.state === "idle" ? (
          <div className="space-y-3">
            <p className="text-xs text-cream-100/40 font-medium">
              Net = what was paid - what had to be paid - what was received
            </p>
            <div className="grid gap-4 text-sm md:grid-cols-2">
              {debtProfileLabels.map((profile) => (
                <div
                  key={profile.id}
                  className="space-y-3 rounded-2xl border border-cream-500/10 bg-obsidian-950/40 p-4 transition-all duration-300 hover:border-cream-500/20"
                >
                  <div className="text-xs font-bold uppercase tracking-wider text-cream-500/80">
                    {profile.display_name || profile.id}
                  </div>
                  
                  <div className="space-y-2 rounded-xl border border-cream-500/5 bg-obsidian-900/40 p-3">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-cream-100/30">
                      What was paid
                    </div>
                    <div className="flex items-center justify-between">
                      <Tooltip label="Total amount this person paid on transactions split as custom.">
                        <span className="text-cream-100/60">Custom split paid</span>
                      </Tooltip>
                      <span className="text-cream-100 font-mono">
                        {formatCurrency(profile.customSplitPaid)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-cream-100/60">Owed paid (for others)</span>
                      <span className="text-cream-100 font-mono">
                        {formatCurrency(profile.owedPaid)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-cream-100/60">Liquidations paid</span>
                      <span className="text-cream-100 font-mono">
                        {formatCurrency(profile.owedPaid)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t border-cream-500/10 pt-2 mt-1">
                      <span className="font-semibold text-cream-50">Paid total</span>
                      <span className="font-bold text-cream-50 font-mono">
                        {formatCurrency(profile.paidTotal)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 rounded-xl border border-cream-500/5 bg-obsidian-900/40 p-3">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-cream-100/30">
                      What had to be paid
                    </div>
                    <div className="flex items-center justify-between">
                      <Tooltip label="Total share this person should cover based on custom split percentages.">
                        <span className="text-cream-100/60">Custom split share</span>
                      </Tooltip>
                      <span className="text-cream-100 font-mono">
                        {formatCurrency(profile.customSplitShare)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-cream-100/60">Owed expenses</span>
                      <span className="text-cream-100 font-mono">
                        {formatCurrency(profile.owedTransactions)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t border-cream-500/10 pt-2 mt-1">
                      <span className="font-semibold text-cream-50">To pay total</span>
                      <span className="font-bold text-cream-50 font-mono">
                        {formatCurrency(profile.toPayTotal)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 rounded-xl border border-cream-500/5 bg-obsidian-900/40 p-3">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-cream-100/30">
                      What was received
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-cream-100/60">Liquidations received</span>
                      <span className="text-cream-100 font-mono">
                        {formatCurrency(profile.liquidationsReceived)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t border-cream-500/10 pt-2 mt-1">
                      <span className="font-semibold text-cream-50">Received total</span>
                      <span className="font-bold text-cream-50 font-mono">
                        {formatCurrency(profile.receivedTotal)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-cream-500/15 pt-3 mt-2">
                    <span className="font-display font-semibold text-cream-200">Person net</span>
                    <span className={`font-display font-bold ${profile.net >= 0 ? 'text-sage-400' : 'text-coral-400'}`}>
                      {formatCurrency(profile.net)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 rounded-2xl border border-cream-500/15 bg-obsidian-800/40 p-6 shadow-card backdrop-blur-sm md:grid-cols-5 animate-slide-up stagger-2">
        <label className="space-y-2 text-sm font-medium text-cream-200 tracking-wide">
          Month
          <SelectField
            className="w-full appearance-none rounded-lg border border-cream-500/20 bg-obsidian-950/80 px-3 py-2 pr-9 text-sm text-cream-50 hover:border-cream-500/30 focus:outline-none focus:ring-2 focus:ring-cream-500/30 transition-all duration-200"
            value={filters.month}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                month: event.target.value,
              }))
            }
          >
            <option value="">All months</option>
            {monthOptions.map((month) => (
              <option key={month} value={month}>
                {formatMonthLabel(month)}
              </option>
            ))}
          </SelectField>
        </label>
        <label className="space-y-2 text-sm font-medium text-cream-200 tracking-wide">
          Type
          <SelectField
            className="w-full appearance-none rounded-lg border border-cream-500/20 bg-obsidian-950/80 px-3 py-2 pr-9 text-sm text-cream-50 hover:border-cream-500/30 focus:outline-none focus:ring-2 focus:ring-cream-500/30 transition-all duration-200"
            value={filters.type}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                type: event.target.value,
              }))
            }
          >
            {typeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectField>
        </label>
        <label className="space-y-2 text-sm font-medium text-cream-200 tracking-wide">
          Category
          <SelectField
            className="w-full appearance-none rounded-lg border border-cream-500/20 bg-obsidian-950/80 px-3 py-2 pr-9 text-sm text-cream-50 hover:border-cream-500/30 focus:outline-none focus:ring-2 focus:ring-cream-500/30 transition-all duration-200"
            value={filters.category}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                category: event.target.value,
              }))
            }
          >
            {categoryFilterOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </SelectField>
        </label>
        <label className="space-y-2 text-sm font-medium text-cream-200 tracking-wide">
          Paid by
          <SelectField
            className="w-full appearance-none rounded-lg border border-cream-500/20 bg-obsidian-950/80 px-3 py-2 pr-9 text-sm text-cream-50 hover:border-cream-500/30 focus:outline-none focus:ring-2 focus:ring-cream-500/30 transition-all duration-200"
            value={filters.payerId}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                payerId: event.target.value,
              }))
            }
          >
            <option value="">All payers</option>
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.display_name || profile.id}
              </option>
            ))}
          </SelectField>
        </label>
        <label className="space-y-2 text-sm font-medium text-cream-200 tracking-wide">
          Split type
          <SelectField
            className="w-full appearance-none rounded-lg border border-cream-500/20 bg-obsidian-950/80 px-3 py-2 pr-9 text-sm text-cream-50 hover:border-cream-500/30 focus:outline-none focus:ring-2 focus:ring-cream-500/30 transition-all duration-200"
            value={filters.split}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                split: event.target.value,
              }))
            }
          >
            <option value="ALL">All splits</option>
            <option value="PERSONAL">Personal</option>
            <option value="OWED">Owed</option>
            <option value="CUSTOM">Custom</option>
          </SelectField>
        </label>
      </section>

      <section className="space-y-4">

        {status.state === "loading" ? (
          <p className="text-sm text-cream-100/60 font-medium">Loading transactions...</p>
        ) : null}

        {status.state === "error" ? (
          <p className="text-sm text-coral-300 font-medium">{status.message}</p>
        ) : null}

        {status.state === "idle" && filteredTransactions.length === 0 ? (
          <p className="text-sm text-cream-100/40 font-medium">No transactions found.</p>
        ) : null}

        {groupedTransactions.map((group) => {
          const monthLabel =
            group.month === "unknown"
              ? "Unknown date"
              : formatMonthLabel(group.month);

          return (
            <div key={group.month} className="space-y-3 animate-slide-up">
              <div className="text-base font-display font-semibold text-cream-100 tracking-tight">
                {monthLabel}
              </div>
              <div className="grid grid-cols-[50px_100px_1fr_80px] gap-2 px-3 text-xs text-cream-100/50 font-semibold uppercase tracking-wider md:grid-cols-[60px_120px_140px_1fr_100px_90px_72px]">
                <span>Day</span>
                <span>Paid by</span>
                <span className="md:hidden">Note</span>
                <span className="hidden md:block">Category</span>
                <span className="hidden md:block">Note</span>
                <span className="hidden md:block">Split</span>
                <span className="text-right">Amount</span>
              </div>
              <div className="divide-y divide-cream-500/10 rounded-2xl border border-cream-500/15 bg-obsidian-800/40 shadow-card backdrop-blur-sm">
                {group.items.map((transaction) => (
                  <TransactionRow
                    key={transaction.id}
                    transaction={transaction}
                    profiles={profiles}
                    categoryOptions={categories}
                    onSave={handleUpdate}
                    onDelete={handleDelete}
                    isSaving={savingId === transaction.id}
                    isDeleting={deletingId === transaction.id}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </section>
    </main>
  );
}
