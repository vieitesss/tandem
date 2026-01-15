"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const typeOptions = [
  { value: "ALL", label: "All" },
  { value: "EXPENSE", label: "Expense" },
  { value: "INCOME", label: "Income" },
  { value: "LIQUIDATION", label: "Liquidation" },
];

const categoryOptions = [
  "All",
  "Groceries",
  "Rent",
  "Utilities",
  "Restaurants",
  "Transport",
  "Health",
  "Entertainment",
  "Travel",
  "Shopping",
  "Subscriptions",
  "Salary",
  "Freelance",
  "Gifts",
  "Pets",
  "Education",
  "Insurance",
  "Home",
  "Kids",
  "Taxes",
  "Other",
];

const formatCurrency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "EUR",
});

const monthFormatter = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
});

const formatMonthLabel = (value) => {
  if (!value) {
    return "";
  }

  const [year, month] = String(value).split("-");
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, 1));

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return monthFormatter.format(date);
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [status, setStatus] = useState({ state: "idle", message: "" });
  const [filters, setFilters] = useState({
    month: "",
    type: "ALL",
    category: "All",
  });

  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

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

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 p-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">Transactions</h1>
          <div className="flex items-center gap-2 text-slate-300">
            <Link
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 hover:border-slate-500"
              href="/"
              aria-label="Add transaction"
              title="Add transaction"
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M10 4.5a.75.75 0 01.75.75v3h3a.75.75 0 010 1.5h-3v3a.75.75 0 01-1.5 0v-3h-3a.75.75 0 010-1.5h3v-3A.75.75 0 0110 4.5z" />
              </svg>
            </Link>
            <Link
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 hover:border-slate-500"
              href="/profiles"
              aria-label="Manage profiles"
              title="Manage profiles"
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M10 10a3 3 0 100-6 3 3 0 000 6z" />
                <path d="M4.5 16a5.5 5.5 0 0111 0v.5h-11V16z" />
              </svg>
            </Link>
          </div>
        </div>
        <p className="text-sm text-slate-400">
          Review every transaction and filter by month, type, or category.
        </p>
      </header>

      <section className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-4 md:grid-cols-3">
        <label className="space-y-2 text-sm text-slate-300">
          Month
          <select
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
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
          </select>
        </label>
        <label className="space-y-2 text-sm text-slate-300">
          Type
          <select
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
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
          </select>
        </label>
        <label className="space-y-2 text-sm text-slate-300">
          Category
          <select
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            value={filters.category}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                category: event.target.value,
              }))
            }
          >
            {categoryOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="space-y-2 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
        <div className="hidden grid-cols-[120px_120px_1fr_160px_120px] gap-3 px-3 text-xs text-slate-400 md:grid">
          <span>Date</span>
          <span>Type</span>
          <span>Category</span>
          <span>Paid by</span>
          <span className="text-right">Amount</span>
        </div>

        {status.state === "loading" ? (
          <p className="text-sm text-slate-400">Loading transactions...</p>
        ) : null}

        {status.state === "error" ? (
          <p className="text-sm text-rose-300">{status.message}</p>
        ) : null}

        {status.state === "idle" && transactions.length === 0 ? (
          <p className="text-sm text-slate-500">No transactions found.</p>
        ) : null}

        {transactions.map((transaction) => {
          const typeClass =
            transaction.type === "INCOME"
              ? "text-emerald-300"
              : transaction.type === "EXPENSE"
                ? "text-rose-300"
                : "text-slate-200";

          const amountClass =
            transaction.type === "INCOME"
              ? "text-emerald-300"
              : transaction.type === "EXPENSE"
                ? "text-rose-300"
                : "text-slate-50";

          const formattedDate = transaction.date
            ? new Date(transaction.date).toLocaleDateString("en-GB")
            : "—";

          return (
            <div
              key={transaction.id}
              className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm"
            >
              <div className="space-y-2 md:hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Date</span>
                  <span className="text-slate-200">{formattedDate}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Type</span>
                  <span className={typeClass}>{transaction.type || "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Category</span>
                  <span className="text-slate-200">
                    {transaction.category || "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Paid by</span>
                  <span className="text-slate-200">
                    {transaction.payer_name || transaction.payer_id || "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Amount</span>
                  <span className={amountClass}>
                    {formatCurrency.format(Number(transaction.amount || 0))}
                  </span>
                </div>
              </div>

              <div className="hidden gap-2 md:grid md:grid-cols-[120px_120px_1fr_160px_120px]">
                <div className="text-slate-200">{formattedDate}</div>
                <div className={typeClass}>{transaction.type || "—"}</div>
                <div className="text-slate-200">
                  {transaction.category || "—"}
                </div>
                <div className="text-slate-200">
                  {transaction.payer_name || transaction.payer_id || "—"}
                </div>
                <div className={`text-right ${amountClass}`}>
                  {formatCurrency.format(Number(transaction.amount || 0))}
                </div>
              </div>
            </div>
          );
        })}
      </section>
    </main>
  );
}
