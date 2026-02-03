import { useEffect, useMemo, useState } from "react";

import { fetchJson } from "../shared/api";
import { categoryOptions } from "../shared/transactions";

export const useTransactionsLookups = () => {
  const [profiles, setProfiles] = useState([]);
  const [categories, setCategories] = useState(categoryOptions);
  const apiBaseUrl = "/api";

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

  return {
    profiles,
    categories,
    categoryFilterOptions,
  };
};
