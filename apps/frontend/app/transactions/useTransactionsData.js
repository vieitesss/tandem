import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { fetchJson } from "../shared/api";
import { formatMonthLabel } from "../shared/format";
import { useToast } from "../shared/ToastProvider";
import { useRealtimeUpdates } from "../shared/useRealtimeUpdates";
import {
  getCache,
  getLastUpdatedAt,
  getLastUpdatedMonth,
  notifyTransactionsUpdated,
  setCache,
  subscribeToTransactionsUpdates,
} from "./transactionsCache";

export const useTransactionsData = ({ onRefreshExtras } = {}) => {
  const [transactions, setTransactions] = useState([]);
  const [status, setStatus] = useState({ state: "idle", message: "" });
  const [filters, setFilters] = useState({
    month: "",
    type: "ALL",
    category: "All",
    payerId: "",
    split: "ALL",
  });
  const [monthOptions, setMonthOptions] = useState([]);
  const [allMonthsSelected, setAllMonthsSelected] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const skipNextFetch = useRef(false);
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
  const queryStringRef = useRef("");
  const { showToast } = useToast();

  const apiBaseUrl = "/api";
  const setStatusIdle = () => setStatus({ state: "idle", message: "" });
  const setStatusLoading = () => setStatus({ state: "loading", message: "" });
  const setStatusError = (message) =>
    setStatus({ state: "error", message });
  const markRefresh = () => {
    lastRefreshAt.current = Date.now();
  };
  const syncLastSeenUpdate = () => {
    lastSeenUpdate.current = getLastUpdatedAt();
  };
  const applyTransactionsSnapshot = (nextTransactions) => {
    setTransactions(nextTransactions);
    persistCacheWithState({ transactions: nextTransactions });
    syncLastSeenUpdate();
    markRefresh();
  };
  const applyMonthSnapshot = ({
    nextTransactions,
    normalizedMonths,
    selectedMonth,
  }) => {
    skipNextFetch.current = true;
    setMonthOptions(normalizedMonths);
    setTransactions(nextTransactions);
    setFilters((current) => ({
      ...current,
      month: selectedMonth,
    }));
    setAllMonthsSelected(false);
    setStatusIdle();
    persistCacheWithState({
      transactions: nextTransactions,
      monthOptions: normalizedMonths,
      selectedMonth,
      allMonthsSelected: false,
    });
    markRefresh();
  };
  const applyEmptyState = (normalizedMonths = []) => {
    skipNextFetch.current = true;
    setMonthOptions(normalizedMonths);
    setTransactions([]);
    setFilters((current) => ({
      ...current,
      month: "",
    }));
    setAllMonthsSelected(false);
    setStatusIdle();
    persistCacheWithState({
      transactions: [],
      monthOptions: normalizedMonths,
      selectedMonth: "",
      allMonthsSelected: false,
    });
    markRefresh();
  };
  const queueOrShowToast = (month, timestamp) => {
    const isVisible =
      typeof document === "undefined" ||
      document.visibilityState === "visible";

    if (isVisible) {
      showExternalToast(month, timestamp);
    } else {
      pendingToast.current = {
        month,
        timestamp,
      };
    }
  };
  const persistCache = (payload) => {
    setCache({ ...payload, lastUpdatedAt: Date.now() });
  };
  const persistCacheWithState = (overrides = {}) => {
    persistCache({
      transactions,
      monthOptions,
      selectedMonth: filters.month,
      allMonthsSelected,
      ...overrides,
    });
  };
  const normalizeMonths = (months, latestMonth) => {
    if (months.length > 0) {
      return months;
    }

    return latestMonth ? [latestMonth] : [];
  };

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

  useEffect(() => {
    queryStringRef.current = queryString;
  }, [queryString]);

  useEffect(() => {
    if (cacheApplied.current || hasInitialized) {
      return;
    }

    cacheApplied.current = true;
    syncLastSeenUpdate();
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
      setStatusIdle();
      setHasInitialized(true);
      lastSeenUpdate.current = Math.max(cachedTimestamp, latestTimestamp);
      markRefresh();
      return;
    }

    initRequestId.current += 1;
    const requestId = initRequestId.current;

    setStatusLoading();

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
        const normalizedMonths = normalizeMonths(months, latestMonth);

        setMonthOptions(normalizedMonths);

        if (!latestMonth) {
          applyEmptyState(normalizedMonths);
          setHasInitialized(true);
          syncLastSeenUpdate();
          return;
        }

        fetchJson(`${apiBaseUrl}/transactions?month=${latestMonth}`)
          .then(({ data }) => {
            if (requestId !== initRequestId.current) {
              return;
            }

            const nextTransactions = Array.isArray(data) ? data : [];
            applyMonthSnapshot({
              nextTransactions,
              normalizedMonths,
              selectedMonth: latestMonth,
            });
            syncLastSeenUpdate();
          })
          .catch(() => {
            if (requestId !== initRequestId.current) {
              return;
            }

            setStatusError("Failed to load transactions.");
          })
          .finally(() => {
            if (requestId === initRequestId.current) {
              setHasInitialized(true);
              markRefresh();
            }
          });
      })
      .catch(() => {
        if (requestId !== initRequestId.current) {
          return;
        }

        setStatusIdle();
        setHasInitialized(true);
        markRefresh();
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
            applyEmptyState();
            return null;
          }

          if (!force && latestMonth <= currentMonth) {
            return null;
          }

          setStatusLoading();

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

              applyMonthSnapshot({
                nextTransactions,
                normalizedMonths,
                selectedMonth: latestMonth,
              });
              return null;
            })
            .catch(() => {
              if (requestId !== latestMonthRequestId.current) {
                return null;
              }

              setStatusError("Failed to load transactions.");
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
        persistCacheWithState({ monthOptions: data });
      })
      .catch(() => {});
  }, [allMonthsSelected, apiBaseUrl, filters.month, transactions]);

  const fetchTransactions = useCallback(() => {
    setStatusLoading();
    const requestQueryString = queryString;

    return fetchJson(`${apiBaseUrl}/transactions${requestQueryString}`)
      .then(({ data }) => {
        if (requestQueryString !== queryStringRef.current) {
          return;
        }

        const nextTransactions = Array.isArray(data) ? data : [];
        setStatusIdle();
        applyTransactionsSnapshot(nextTransactions);

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

        setStatusError("Failed to load transactions.");
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
          queueOrShowToast(updatedMonth, latestTimestamp);
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

  const refreshAll = useCallback(() => {
    if (!hasInitialized) {
      return Promise.resolve();
    }

    const tasks = [fetchTransactions()];
    if (typeof onRefreshExtras === "function") {
      tasks.push(onRefreshExtras());
    }

    return Promise.all(tasks);
  }, [fetchTransactions, hasInitialized, onRefreshExtras]);

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
        persistCacheWithState({ transactions: nextTransactions });
        syncLastSeenUpdate();
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
        persistCacheWithState({ transactions: nextTransactions });
        syncLastSeenUpdate();
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

  return {
    transactions,
    status,
    filters,
    setFilters,
    monthOptions,
    allMonthsSelected,
    setAllMonthsSelected,
    hasInitialized,
    hasRealtimeUpdate,
    refreshNow,
    savingId,
    deletingId,
    handleUpdate,
    handleDelete,
  };
};
