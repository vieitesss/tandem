import { useCallback, useEffect, useMemo, useState } from "react";

export const useRealtimeUpdates = ({
  tables,
  onRefresh,
  channelName,
  preserveScroll = false,
}) => {
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
    if (tablesList.length === 0) {
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

    const eventSource = new EventSource(`/api/realtime?${params.toString()}`);
    eventSource.onmessage = handleRealtimeChange;

    return () => {
      eventSource.close();
    };
  }, [channelName, refreshNow, tablesKey, tablesList]);

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
