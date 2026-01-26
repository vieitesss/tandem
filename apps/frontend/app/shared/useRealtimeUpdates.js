import { useCallback, useEffect, useMemo, useState } from "react";

export const useRealtimeUpdates = ({
  tables,
  onRefresh,
  channelName,
  preserveScroll = false,
}) => {
  const [resolvedBaseUrl, setResolvedBaseUrl] = useState(() => {
    return process.env.NEXT_PUBLIC_SSE_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || null;
  });
  const [hasRealtimeUpdate, setHasRealtimeUpdate] = useState(false);
  const tablesKey = useMemo(() => {
    if (!Array.isArray(tables)) {
      return "";
    }

    return tables.join("|");
  }, [tables]);
  const tablesList = useMemo(
    () => (tablesKey ? tablesKey.split("|") : []),
    [tablesKey]
  );

  const refreshNow = useCallback(() => {
    setHasRealtimeUpdate(false);

    if (typeof window === "undefined" || !preserveScroll) {
      return onRefresh();
    }

    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    const restoreScroll = () => {
      if (typeof window === "undefined") {
        return;
      }

      window.scrollTo(scrollX, scrollY);
    };

    const refreshResult = onRefresh();

    Promise.resolve(refreshResult).finally(() => {
      if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(() => requestAnimationFrame(restoreScroll));
      } else {
        restoreScroll();
      }

      setTimeout(restoreScroll, 120);
    });

    return refreshResult;
  }, [onRefresh, preserveScroll]);

  useEffect(() => {
    if (resolvedBaseUrl !== null) {
      return undefined;
    }

    let isActive = true;

    fetch("/api/runtime-config")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!isActive) {
          return;
        }

        const baseUrl =
          typeof data?.sse_base_url === "string" && data.sse_base_url.length > 0
            ? data.sse_base_url
            : "";
        setResolvedBaseUrl(baseUrl);
      })
      .catch(() => {
        if (isActive) {
          setResolvedBaseUrl("");
        }
      });

    return () => {
      isActive = false;
    };
  }, [resolvedBaseUrl]);

  useEffect(() => {
    if (tablesList.length === 0 || resolvedBaseUrl === null) {
      return undefined;
    }

    const handleRealtimeChange = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        refreshNow();
        return;
      }

      setHasRealtimeUpdate(true);
    };

    const params = new URLSearchParams();
    params.set("tables", tablesList.join(","));
    if (channelName) {
      params.set("channel", channelName);
    }

    const realtimeUrl = resolvedBaseUrl
      ? (() => {
          const targetUrl = new URL("/realtime", resolvedBaseUrl);
          targetUrl.search = params.toString();
          return targetUrl.toString();
        })()
      : `/api/realtime?${params.toString()}`;

    const eventSource = new EventSource(realtimeUrl);
    eventSource.onmessage = handleRealtimeChange;

    return () => {
      eventSource.close();
    };
  }, [channelName, refreshNow, tablesKey, tablesList, resolvedBaseUrl]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return undefined;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && hasRealtimeUpdate) {
        refreshNow();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [hasRealtimeUpdate, refreshNow]);

  return { hasRealtimeUpdate, refreshNow };
};
