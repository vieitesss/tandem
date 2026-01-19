"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import IconLinkButton from "../shared/IconLinkButton";
import SelectField from "../shared/SelectField";
import Tooltip from "../shared/Tooltip";
import { formatCurrency, formatMonthLabel, formatShortDate } from "../shared/format";
import {
  categoryFilterOptions,
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

  useEffect(() => {
    setStatus({ state: "loading", message: "" });

    fetch(`${apiBaseUrl}/transactions${queryString}`)
      .then((response) => response.json())
      .then((data) => {
        setTransactions(Array.isArray(data) ? data : []);
        setStatus({ state: "idle", message: "" });
      })
      .catch(() => {
        setStatus({ state: "error", message: "Failed to load transactions." });
        setTransactions([]);
      });
  }, [apiBaseUrl, queryString]);

  useEffect(() => {
    fetch(`${apiBaseUrl}/profiles`)
      .then((response) => response.json())
      .then((data) => {
        setProfiles(Array.isArray(data) ? data : []);
      })
      .catch(() => setProfiles([]));
  }, [apiBaseUrl]);

  useEffect(() => {
    if (!debtFromDate) {
      return;
    }

    setDebtSummary({ state: "loading", message: "", data: null });

    fetch(`${apiBaseUrl}/debt-summary?from=${encodeURIComponent(debtFromDate)}`)
      .then((response) => response.json())
      .then((data) => {
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
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:p-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src="/icon.png"
              alt="Tandem"
              className="h-8 w-8 md:h-9 md:w-9"
            />
            <h1 className="text-2xl font-semibold">Transactions</h1>
          </div>
          <div className="hidden items-center gap-2 text-slate-300 md:flex">
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
        <p className="text-sm text-slate-400">
          Review every transaction and filter by month, type, category, or payer.
        </p>
      </header>

      <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Debt summary
            </p>
            <h2 className="text-lg font-semibold text-slate-100">
              {debtLine}
            </h2>
            <p className="text-xs text-slate-400">
              From {formatShortDate(debtFromDate)} onward.
            </p>
            <Link
              className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-200 hover:text-sky-100"
              href={`/debt-breakdown?from=${encodeURIComponent(debtFromDate)}`}
            >
              See breakdown
            </Link>


          </div>
          <label className="space-y-2 text-xs text-slate-400">
            From date
            <input
              className="w-full min-w-[180px] rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
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
        <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm">
          <span className="text-slate-400">Total custom split expenses</span>
          <span className="text-slate-100">{formatCurrency(debtCustomSplitTotal)}</span>
        </div>
        {debtSummary.state === "loading" ? (
          <p className="text-sm text-slate-400">Loading debt summary...</p>
        ) : null}
        {debtSummary.state === "error" ? (
          <p className="text-sm text-rose-300">{debtSummary.message}</p>
        ) : null}
        {debtSummary.state === "idle" ? (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              Net = what was paid - what had to be paid - what was received
            </p>
            <div className="grid gap-3 text-sm md:grid-cols-2">
              {debtProfileLabels.map((profile) => (
                <div
                  key={profile.id}
                  className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/40 p-3"
                >
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    {profile.display_name || profile.id}
                  </div>
                  <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/60 p-2">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      What was paid
                    </div>
                    <div className="flex items-center justify-between">
                      <Tooltip label="Total amount this person paid on transactions split as custom.">
                        <span className="text-slate-400">Custom split paid</span>
                      </Tooltip>
                      <span className="text-slate-100">
                        {formatCurrency(profile.customSplitPaid)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Owed paid (for others)</span>
                      <span className="text-slate-100">
                        {formatCurrency(profile.owedPaid)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Liquidations paid</span>
                      <span className="text-slate-100">
                        {formatCurrency(profile.liquidationsPaid)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-800 pt-2">
                      <span className="text-slate-200">Paid total</span>
                      <span className="text-slate-50">
                        {formatCurrency(profile.paidTotal)}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/60 p-2">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      What had to be paid
                    </div>
                    <div className="flex items-center justify-between">
                      <Tooltip label="Total share this person should cover based on custom split percentages.">
                        <span className="text-slate-400">Custom split share</span>
                      </Tooltip>
                      <span className="text-slate-100">
                        {formatCurrency(profile.customSplitShare)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Owed expenses</span>
                      <span className="text-slate-100">
                        {formatCurrency(profile.owedTransactions)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-800 pt-2">
                      <span className="text-slate-200">To pay total</span>
                      <span className="text-slate-50">
                        {formatCurrency(profile.toPayTotal)}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/60 p-2">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      What was received
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Liquidations received</span>
                      <span className="text-slate-100">
                        {formatCurrency(profile.liquidationsReceived)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-800 pt-2">
                      <span className="text-slate-200">Received total</span>
                      <span className="text-slate-50">
                        {formatCurrency(profile.receivedTotal)}
                      </span>
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-2 text-xs text-slate-400">
                    <p>
                      {formatCurrency(profile.paidTotal)} -
                      {formatCurrency(profile.toPayTotal)} -
                      {formatCurrency(profile.receivedTotal)} =
                      {formatCurrency(profile.net)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-800 pt-2">
                    <span className="text-slate-200">Person debt</span>
                    <span className="text-slate-50">
                      {formatCurrency(profile.net)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-4 md:grid-cols-5">
        <label className="space-y-2 text-sm text-slate-300">
          Month
          <SelectField
            className="w-full appearance-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 pr-9 text-sm text-slate-200"
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
        <label className="space-y-2 text-sm text-slate-300">
          Type
          <SelectField
            className="w-full appearance-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 pr-9 text-sm text-slate-200"
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
        <label className="space-y-2 text-sm text-slate-300">
          Category
          <SelectField
            className="w-full appearance-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 pr-9 text-sm text-slate-200"
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
        <label className="space-y-2 text-sm text-slate-300">
          Paid by
          <SelectField
            className="w-full appearance-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 pr-9 text-sm text-slate-200"
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
        <label className="space-y-2 text-sm text-slate-300">
          Split type
          <SelectField
            className="w-full appearance-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 pr-9 text-sm text-slate-200"
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
          <p className="text-sm text-slate-400">Loading transactions...</p>
        ) : null}

        {status.state === "error" ? (
          <p className="text-sm text-rose-300">{status.message}</p>
        ) : null}

        {status.state === "idle" && filteredTransactions.length === 0 ? (
          <p className="text-sm text-slate-500">No transactions found.</p>
        ) : null}

        {groupedTransactions.map((group) => {
          const monthLabel =
            group.month === "unknown"
              ? "Unknown date"
              : formatMonthLabel(group.month);

          return (
            <div key={group.month} className="space-y-3">
              <div className="text-sm font-semibold text-slate-200">
                {monthLabel}
              </div>
              <div className="grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 px-3 text-xs text-slate-400 md:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.7fr)_auto_72px]">
                <span>Day</span>
                <span>Paid by</span>
                <span>Category</span>
                <span className="hidden md:block">Note</span>
                <span className="hidden md:block">Split</span>
                <span className="text-right">Amount</span>
              </div>
              <div className="divide-y divide-slate-800 rounded-2xl border border-slate-800 bg-slate-900/40">
                {group.items.map((transaction) => (
                  <TransactionRow
                    key={transaction.id}
                    transaction={transaction}
                    profiles={profiles}
                    categoryOptions={categoryOptions}
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
