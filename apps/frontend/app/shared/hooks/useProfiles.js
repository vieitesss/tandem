import { useCallback, useEffect, useState } from "react";

import { apiGet } from "../api";

export const useProfiles = () => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const nextData = await apiGet("/profiles", "Failed to load profiles.");
      setData(Array.isArray(nextData) ? nextData : []);
      return nextData;
    } catch (nextError) {
      setData([]);
      setError(nextError);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    data,
    isLoading,
    error,
    refresh,
  };
};
