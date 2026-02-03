import { useEffect, useMemo, useState } from "react";

import { fetchJson } from "../shared/api";
import { categoryOptions } from "../shared/transactions";

const API_BASE_URL = "/api";

export const useTransactionsLookups = () => {
  const [profiles, setProfiles] = useState([]);
  const [categories, setCategories] = useState(categoryOptions);
  useEffect(() => {
    fetchJson(`${API_BASE_URL}/profiles`)
      .then(({ data }) => {
        setProfiles(Array.isArray(data) ? data : []);
      })
      .catch(() => setProfiles([]));
  }, []);

  useEffect(() => {
    fetchJson(`${API_BASE_URL}/categories`)
      .then(({ data }) => {
        if (Array.isArray(data) && data.length > 0) {
          setCategories(data);
        }
      })
      .catch(() => setCategories(categoryOptions));
  }, []);

  const categoryFilterOptions = useMemo(() => {
    return ["All", ...categories.map((option) => option.label)];
  }, [categories]);

  return {
    profiles,
    categories,
    categoryFilterOptions,
  };
};
