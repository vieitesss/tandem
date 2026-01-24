import { useCallback, useEffect, useMemo, useState } from "react";

import { supabase } from "./supabaseClient";

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
    if (!supabase || tablesList.length === 0) {
      return undefined;
    }

    const handleRealtimeChange = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        refreshNow();
        return;
      }

      setHasRealtimeUpdate(true);
    };

    const channelId = channelName || `realtime-updates-${tablesKey}`;
    let channel = supabase.channel(channelId);

    tablesList.forEach((table) => {
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        handleRealtimeChange
      );
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
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
