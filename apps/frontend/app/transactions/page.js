"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import DesktopHeaderActions from "../shared/DesktopHeaderActions";
import SecondaryActions, { SecondaryLink } from "../shared/SecondaryActions";
import SelectField from "../shared/SelectField";
import { fetchJson } from "../shared/api";
import { formatCurrency, formatMonthLabel } from "../shared/format";
import { useToast } from "../shared/ToastProvider";
import { useRealtimeUpdates } from "../shared/useRealtimeUpdates";
import {
  categoryOptions,
  typeOptions,
} from "../shared/transactions";
import TransactionRow from "./TransactionRow";
import {
  getCache,
  getLastUpdatedAt,
  getLastUpdatedMonth,
  notifyTransactionsUpdated,
  setCache,
  subscribeToTransactionsUpdates,
} from "./transactionsCache";

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
  const skipNextFetch = useRef(false);
  const [profiles, setProfiles] = useState([]);
  const [categories, setCategories] = useState(categoryOptions);
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [monthOptions, setMonthOptions] = useState([]);
  const [allMonthsSelected, setAllMonthsSelected] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const initRequestId = useRef(0);
  const latestMonthRequestId = useRef(0);
  const latestMonthChecked = useRef(false);
  const cacheApplied = useRef(false);
  const shouldRefreshOnInit = useRef(false);
  const lastSeenUpdate = useRef(0);
  const lastRefreshAt = useRef(0);
  const lastNotifiedUpdate = useRef(0);
  const lastNotifiedMonth = useRef("");
  const pendingToast = useRef(null);
  const { showToast } = useToast();
  const [debtSummary, setDebtSummary] = useState({
    state: "idle",
    message: "",
    data: null,
  });

  const apiBaseUrl = "/api";
  const queryStringRef = useRef("");

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

  useEffect(() => {
    queryStringRef.current = queryString;
  }, [queryString]);

  useEffect(() => {
    if (cacheApplied.current || hasInitialized) {
      return;
    }

    cacheApplied.current = true;
    lastSeenUpdate.current = getLastUpdatedAt();
    const cached = getCache();
    if (cached) {
      const cachedTimestamp = Number(cached.lastUpdatedAt || 0);
      const latestTimestamp = getLastUpdatedAt();
      shouldRefreshOnInit.current =
        latestTimestamp > 0 && latestTimestamp > cachedTimestamp;
      skipNextFetch.current = true;
      setTransactions(Array.isArray(cached.transactions) ? cached.transactions : []);
      setMonthOptions(Array.isArray(cached.monthOptions) ? cached.monthOptions : []);
      setFilters((current) => ({
        ...current,
        month: cached.selectedMonth || "",
      }));
      setAllMonthsSelected(Boolean(cached.allMonthsSelected));
      setStatus({ state: "idle", message: "" });
      setHasInitialized(true);
      lastSeenUpdate.current = Math.max(cachedTimestamp, latestTimestamp);
      lastRefreshAt.current = Date.now();
      return;
    }

    initRequestId.current += 1;
    const requestId = initRequestId.current;

    setStatus({ state: "loading", message: "" });

    Promise.all([
      fetchJson(`${apiBaseUrl}/transactions/months`),
      fetchJson(`${apiBaseUrl}/transactions/latest-month`),
    ])
      .then(([monthsResponse, latestResponse]) => {
        if (requestId !== initRequestId.current) {
          return;
        }

        const months = Array.isArray(monthsResponse.data) ? monthsResponse.data : [];
        const latestMonth = latestResponse.data?.latest_month || null;
        const normalizedMonths =
          months.length > 0 ? months : latestMonth ? [latestMonth] : [];

        setMonthOptions(normalizedMonths);

        if (!latestMonth) {
          setStatus({ state: "idle", message: "" });
          setHasInitialized(true);
          setCache({
            transactions: [],
            monthOptions: normalizedMonths,
            selectedMonth: "",
            allMonthsSelected: false,
            lastUpdatedAt: Date.now(),
          });
          lastSeenUpdate.current = getLastUpdatedAt();
          lastRefreshAt.current = Date.now();
          return;
        }

        fetchJson(`${apiBaseUrl}/transactions?month=${latestMonth}`)
          .then(({ data }) => {
            if (requestId !== initRequestId.current) {
              return;
            }

            skipNextFetch.current = true;
            const nextTransactions = Array.isArray(data) ? data : [];
            setTransactions(nextTransactions);
            setFilters((current) => ({
              ...current,
              month: latestMonth,
            }));
            setAllMonthsSelected(false);
            setStatus({ state: "idle", message: "" });
            setCache({
              transactions: nextTransactions,
              monthOptions: normalizedMonths,
              selectedMonth: latestMonth,
              allMonthsSelected: false,
              lastUpdatedAt: Date.now(),
            });
            lastSeenUpdate.current = getLastUpdatedAt();
            lastRefreshAt.current = Date.now();
          })
          .catch(() => {
            if (requestId !== initRequestId.current) {
              return;
            }

            setStatus({ state: "error", message: "Failed to load transactions." });
          })
          .finally(() => {
            if (requestId === initRequestId.current) {
              setHasInitialized(true);
              lastRefreshAt.current = Date.now();
            }
          });
      })
      .catch(() => {
        if (requestId !== initRequestId.current) {
          return;
        }

        setStatus({ state: "idle", message: "" });
        setHasInitialized(true);
        lastRefreshAt.current = Date.now();
      });
  }, [apiBaseUrl, hasInitialized]);

  const refreshLatestMonth = useCallback(
    ({ force = false } = {}) => {
      if (allMonthsSelected && !force) {
        return Promise.resolve();
      }

      latestMonthRequestId.current += 1;
      const requestId = latestMonthRequestId.current;

      return fetchJson(`${apiBaseUrl}/transactions/latest-month`)
        .then(({ data }) => {
          if (requestId !== latestMonthRequestId.current) {
            return null;
          }

          const latestMonth = data?.latest_month || null;
          const currentMonth = filters.month || "";

          if (!latestMonth) {
            skipNextFetch.current = true;
            setMonthOptions([]);
            setTransactions([]);
            setFilters((current) => ({
              ...current,
              month: "",
            }));
            setAllMonthsSelected(false);
            setStatus({ state: "idle", message: "" });
            setCache({
              transactions: [],
              monthOptions: [],
              selectedMonth: "",
              allMonthsSelected: false,
              lastUpdatedAt: Date.now(),
            });
            lastRefreshAt.current = Date.now();
            return null;
          }

          if (!force && latestMonth <= currentMonth) {
            return null;
          }

          setStatus({ state: "loading", message: "" });

          return Promise.all([
            fetchJson(`${apiBaseUrl}/transactions/months`),
            fetchJson(`${apiBaseUrl}/transactions?month=${latestMonth}`),
          ])
            .then(([monthsResponse, transactionsResponse]) => {
              if (requestId !== latestMonthRequestId.current) {
                return null;
              }

              const months = Array.isArray(monthsResponse.data)
                ? monthsResponse.data
                : [];
              const normalizedMonths =
                months.length > 0 ? months : [latestMonth];
              const nextTransactions = Array.isArray(transactionsResponse.data)
                ? transactionsResponse.data
                : [];

              skipNextFetch.current = true;
              setMonthOptions(normalizedMonths);
              setTransactions(nextTransactions);
              setFilters((current) => ({
                ...current,
                month: latestMonth,
              }));
              setAllMonthsSelected(false);
              setStatus({ state: "idle", message: "" });
              setCache({
                transactions: nextTransactions,
                monthOptions: normalizedMonths,
                selectedMonth: latestMonth,
                allMonthsSelected: false,
                lastUpdatedAt: Date.now(),
              });
              lastRefreshAt.current = Date.now();
              return null;
            })
            .catch(() => {
              if (requestId !== latestMonthRequestId.current) {
                return null;
              }

              setStatus({ state: "error", message: "Failed to load transactions." });
              return null;
            });
        })
        .catch(() => null);
    },
    [allMonthsSelected, apiBaseUrl, filters.month]
  );

  const refreshMonthOptions = useCallback(() => {
    return fetchJson(`${apiBaseUrl}/transactions/months`)
      .then(({ data }) => {
        if (!Array.isArray(data)) {
          return;
        }

        setMonthOptions(data);
        setCache({
          transactions,
          monthOptions: data,
          selectedMonth: filters.month,
          allMonthsSelected,
          lastUpdatedAt: Date.now(),
        });
      })
      .catch(() => {});
  }, [allMonthsSelected, apiBaseUrl, filters.month, transactions]);

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

  const totalsByType = useMemo(() => {
    const totals = {
      EXPENSE: 0,
      INCOME: 0,
      LIQUIDATION: 0,
    };

    filteredTransactions.forEach((transaction) => {
      const type = transaction.type;
      if (type && Object.prototype.hasOwnProperty.call(totals, type)) {
        totals[type] += Number(transaction.amount) || 0;
      }
    });

    return totals;
  }, [filteredTransactions]);

  const presentTypes = useMemo(() => {
    return Object.entries(totalsByType)
      .filter(([, total]) => total > 0)
      .map(([type]) => type);
  }, [totalsByType]);

  const fetchTransactions = useCallback(() => {
    setStatus({ state: "loading", message: "" });
    const requestQueryString = queryString;

    return fetchJson(`${apiBaseUrl}/transactions${requestQueryString}`)
      .then(({ data }) => {
        if (requestQueryString !== queryStringRef.current) {
          return;
        }

        const nextTransactions = Array.isArray(data) ? data : [];
        setTransactions(nextTransactions);
        setStatus({ state: "idle", message: "" });
        setCache({
          transactions: nextTransactions,
          monthOptions,
          selectedMonth: filters.month,
          allMonthsSelected,
          lastUpdatedAt: Date.now(),
        });
        lastSeenUpdate.current = getLastUpdatedAt();
        lastRefreshAt.current = Date.now();

        if (
          filters.month &&
          !allMonthsSelected &&
          nextTransactions.length === 0
        ) {
          refreshLatestMonth({ force: true });
        }
      })
      .catch(() => {
        if (requestQueryString !== queryStringRef.current) {
          return;
        }

        setStatus({ state: "error", message: "Failed to load transactions." });
        setTransactions([]);
      });
  }, [
    allMonthsSelected,
    apiBaseUrl,
    filters.month,
    monthOptions,
    queryString,
    refreshLatestMonth,
  ]);

  useEffect(() => {
    if (!hasInitialized) {
      return;
    }

    if (!filters.month && !allMonthsSelected) {
      return;
    }

    if (skipNextFetch.current) {
      skipNextFetch.current = false;
      return;
    }

    fetchTransactions();
  }, [allMonthsSelected, fetchTransactions, filters.month, hasInitialized]);

  const refreshCurrentView = useCallback(() => {
    if (!hasInitialized) {
      return Promise.resolve();
    }

    if (!filters.month && !allMonthsSelected) {
      return refreshLatestMonth({ force: true });
    }

    return fetchTransactions();
  }, [
    allMonthsSelected,
    fetchTransactions,
    filters.month,
    hasInitialized,
    refreshLatestMonth,
  ]);

  const showExternalToast = useCallback(
    (month, timestamp) => {
      if (!month) {
        return;
      }

      const monthLabel = formatMonthLabel(month);
      showToast(`New transactions in ${monthLabel}.`);
      lastNotifiedUpdate.current = timestamp;
      lastNotifiedMonth.current = month;
    },
    [showToast]
  );

  const handleExternalUpdate = useCallback(
    (updatedMonth) => {
      const latestTimestamp = getLastUpdatedAt();
      if (latestTimestamp <= lastSeenUpdate.current) {
        return;
      }

      lastSeenUpdate.current = latestTimestamp;
      refreshMonthOptions();

      if (allMonthsSelected) {
        refreshCurrentView();
        return;
      }

      if (updatedMonth && updatedMonth !== filters.month) {
        if (
          latestTimestamp > lastNotifiedUpdate.current ||
          updatedMonth !== lastNotifiedMonth.current
        ) {
          const isVisible =
            typeof document === "undefined" ||
            document.visibilityState === "visible";

          if (isVisible) {
            showExternalToast(updatedMonth, latestTimestamp);
          } else {
            pendingToast.current = {
              month: updatedMonth,
              timestamp: latestTimestamp,
            };
          }
        }
        return;
      }

      refreshCurrentView();
    },
    [
      allMonthsSelected,
      filters.month,
      refreshCurrentView,
      refreshMonthOptions,
      showExternalToast,
    ]
  );

  const refreshOnFocus = useCallback(() => {
    if (!hasInitialized) {
      return;
    }

    const now = Date.now();
    if (now - lastRefreshAt.current < 2000) {
      return;
    }

    if (pendingToast.current) {
      const { month, timestamp } = pendingToast.current;
      if (
        timestamp > lastNotifiedUpdate.current ||
        month !== lastNotifiedMonth.current
      ) {
        showExternalToast(month, timestamp);
      }
      pendingToast.current = null;
    }

    handleExternalUpdate(getLastUpdatedMonth());
  }, [handleExternalUpdate, hasInitialized, showExternalToast]);

  useEffect(() => {
    if (!hasInitialized) {
      return;
    }

    if (latestMonthChecked.current) {
      return;
    }

    latestMonthChecked.current = true;
    refreshLatestMonth();
  }, [hasInitialized, refreshLatestMonth]);

  useEffect(() => {
    if (!hasInitialized) {
      return;
    }

    if (!shouldRefreshOnInit.current) {
      return;
    }

    shouldRefreshOnInit.current = false;
    refreshCurrentView();
  }, [hasInitialized, refreshCurrentView]);

  useEffect(() => {
    if (!hasInitialized) {
      return;
    }

    return subscribeToTransactionsUpdates((event) => {
      const updatedMonth =
        typeof event?.month === "string" && event.month.length > 0
          ? event.month
          : getLastUpdatedMonth();
      handleExternalUpdate(updatedMonth);
    });
  }, [handleExternalUpdate, hasInitialized]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        return;
      }
      refreshOnFocus();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshOnFocus]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.addEventListener("focus", refreshOnFocus);
    return () => window.removeEventListener("focus", refreshOnFocus);
  }, [refreshOnFocus]);

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
    setDebtSummary({ state: "loading", message: "", data: null });

    return fetchJson(`${apiBaseUrl}/debt-summary`)
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
  }, [apiBaseUrl]);

  useEffect(() => {
    fetchDebtSummary();
  }, [fetchDebtSummary]);

  const refreshAll = useCallback(() => {
    if (!hasInitialized) {
      return Promise.resolve();
    }

    return Promise.all([fetchTransactions(), fetchDebtSummary()]);
  }, [fetchTransactions, fetchDebtSummary, hasInitialized]);

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

      const updatedMonth = data?.date ? String(data.date).slice(0, 7) : "";
      setTransactions((current) => {
        const nextTransactions = current.map((transaction) =>
          transaction.id === transactionId ? { ...transaction, ...data } : transaction
        );
        setCache({
          transactions: nextTransactions,
          monthOptions,
          selectedMonth: filters.month,
          allMonthsSelected,
          lastUpdatedAt: Date.now(),
        });
        lastSeenUpdate.current = getLastUpdatedAt();
        return nextTransactions;
      });
      notifyTransactionsUpdated({ month: updatedMonth });

      return data;
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (transactionId) => {
    setDeletingId(transactionId);
    let shouldRefreshLatest = false;

    try {
      const response = await fetch(`${apiBaseUrl}/transactions/${transactionId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete transaction.");
      }

      let deletedMonth = "";
      setTransactions((current) => {
        const deletedTransaction = current.find(
          (transaction) => transaction.id === transactionId
        );
        deletedMonth = deletedTransaction?.date
          ? String(deletedTransaction.date).slice(0, 7)
          : "";
        const nextTransactions = current.filter(
          (transaction) => transaction.id !== transactionId
        );
        if (
          filters.month &&
          !allMonthsSelected &&
          deletedMonth &&
          deletedMonth === filters.month &&
          nextTransactions.length === 0
        ) {
          shouldRefreshLatest = true;
        }
        setCache({
          transactions: nextTransactions,
          monthOptions,
          selectedMonth: filters.month,
          allMonthsSelected,
          lastUpdatedAt: Date.now(),
        });
        lastSeenUpdate.current = getLastUpdatedAt();
        return nextTransactions;
      });

      if (shouldRefreshLatest) {
        refreshLatestMonth({ force: true });
      }
      notifyTransactionsUpdated({ month: deletedMonth });

      return data;
    } finally {
      setDeletingId(null);
    }
  };

  const debtBalance = debtSummary.data?.balance || {};
  const debtProfiles = debtSummary.data?.profiles || [];

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
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wider text-cream-100/50 font-semibold">
            Debt Summary
          </p>
          <h2 className="text-xl font-display font-semibold text-cream-50 tracking-tight">
            {debtLine}
          </h2>
          <p className="text-xs text-cream-100/60 font-medium">All-time</p>
        </div>
        {debtSummary.state === "loading" ? (
          <p className="text-sm text-cream-100/60 font-medium">Loading debt summary...</p>
        ) : null}
        {debtSummary.state === "error" ? (
          <p className="text-sm text-coral-300 font-medium">{debtSummary.message}</p>
        ) : null}
      </section>

      <section className="space-y-4">
        {status.state === "idle" && filteredTransactions.length > 0 ? (
          <div className="rounded-xl border border-cream-500/10 bg-obsidian-800/40 p-5 shadow-card backdrop-blur-sm">
            <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-cream-100/40">
              Visible totals
            </div>
            {presentTypes.length === 1 ? (
              <div className="md:flex md:justify-center">
                <div className="flex items-center justify-between gap-4 md:flex-col md:items-start md:gap-1">
                  <span
                    className={`text-xs font-medium uppercase tracking-wider ${
                      presentTypes[0] === "EXPENSE"
                        ? "text-coral-400"
                        : presentTypes[0] === "INCOME"
                          ? "text-sage-400"
                          : "text-cream-50"
                    }`}
                  >
                    {presentTypes[0] === "EXPENSE"
                      ? "Expenses"
                      : presentTypes[0] === "INCOME"
                        ? "Income"
                        : "Liquidation"}
                  </span>
                  <span
                    className={`text-base font-mono font-bold ${
                      presentTypes[0] === "EXPENSE"
                        ? "text-coral-400"
                        : presentTypes[0] === "INCOME"
                          ? "text-sage-400"
                          : "text-cream-50"
                    }`}
                  >
                    {formatCurrency(totalsByType[presentTypes[0]])}
                  </span>
                </div>
              </div>
            ) : (
              <div className="grid gap-y-3 md:grid-cols-3 md:gap-x-6 md:gap-y-0">
                {totalsByType.EXPENSE > 0 ? (
                  <div className="flex w-full items-center justify-between gap-4 md:w-auto md:flex-col md:items-start md:justify-self-start md:text-left md:gap-1">
                    <span className="text-xs font-medium uppercase tracking-wider text-coral-400">
                      Expenses
                    </span>
                    <span className="font-mono font-bold text-coral-400">
                      {formatCurrency(totalsByType.EXPENSE)}
                    </span>
                  </div>
                ) : null}
                {totalsByType.INCOME > 0 ? (
                  <div className="flex w-full items-center justify-between gap-4 md:w-auto md:flex-col md:items-center md:justify-self-center md:text-center md:gap-1">
                    <span className="text-xs font-medium uppercase tracking-wider text-sage-400">
                      Income
                    </span>
                    <span className="font-mono font-bold text-sage-400">
                      {formatCurrency(totalsByType.INCOME)}
                    </span>
                  </div>
                ) : null}
                {totalsByType.LIQUIDATION > 0 ? (
                  <div className="flex w-full items-center justify-between gap-4 md:w-auto md:flex-col md:items-end md:justify-self-end md:text-right md:gap-1">
                    <span className="text-xs font-medium uppercase tracking-wider text-cream-50">
                      Liquidation
                    </span>
                    <span className="font-mono font-bold text-cream-50">
                      {formatCurrency(totalsByType.LIQUIDATION)}
                    </span>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        ) : null}

        <section className="grid gap-4 rounded-2xl border border-cream-500/15 bg-obsidian-800/40 p-6 shadow-card backdrop-blur-sm md:grid-cols-5 animate-slide-up stagger-2">
          <label className="space-y-2 text-sm font-medium text-cream-200 tracking-wide">
            Month
            <SelectField
              className="w-full appearance-none rounded-lg border border-cream-500/20 bg-obsidian-950/80 px-3 py-2 pr-9 text-sm text-cream-50 hover:border-cream-500/30 focus:outline-none focus:ring-2 focus:ring-cream-500/30 transition-all duration-200"
              value={filters.month}
              onChange={(event) => {
                const nextValue = event.target.value;
                setFilters((current) => ({
                  ...current,
                  month: nextValue,
                }));
                setAllMonthsSelected(nextValue === "");
              }}
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
