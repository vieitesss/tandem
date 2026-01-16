"use client";

import { useEffect, useMemo, useState } from "react";

import IconLinkButton from "../shared/IconLinkButton";
import SelectField from "../shared/SelectField";
import { getApiBaseUrl } from "../shared/api";
import { formatMonthLabel } from "../shared/format";
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
  });
  const [profiles, setProfiles] = useState([]);
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const apiBaseUrl = getApiBaseUrl();

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

    transactions.forEach((transaction) => {
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
  }, [transactions]);

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
          Review every transaction and filter by month, type, or category.
        </p>
      </header>

      <section className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-4 md:grid-cols-3">
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
      </section>

      <section className="space-y-4">

        {status.state === "loading" ? (
          <p className="text-sm text-slate-400">Loading transactions...</p>
        ) : null}

        {status.state === "error" ? (
          <p className="text-sm text-rose-300">{status.message}</p>
        ) : null}

        {status.state === "idle" && transactions.length === 0 ? (
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
              <div className="grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 px-3 text-xs text-slate-400 md:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto_72px]">
                <span>Day</span>
                <span>Paid by</span>
                <span>Category</span>
                <span className="hidden md:block">Note</span>
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
