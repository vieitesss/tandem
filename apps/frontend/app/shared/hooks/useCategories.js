import { useCallback, useEffect, useState } from "react";

import { apiGet } from "../api";

export const useCategories = ({ fallback = [] } = {}) => {
  const [data, setData] = useState(fallback);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const nextData = await apiGet("/categories", "Failed to load categories.");
      if (Array.isArray(nextData) && nextData.length > 0) {
        setData(nextData);
      } else {
        setData(fallback);
      }
      return nextData;
    } catch (nextError) {
      setData(fallback);
      setError(nextError);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [fallback]);

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
