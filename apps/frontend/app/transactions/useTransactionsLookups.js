import { useMemo } from "react";

import { useCategories } from "../shared/hooks/useCategories";
import { useProfiles } from "../shared/hooks/useProfiles";
import { categoryOptions } from "../shared/transactions";

export const useTransactionsLookups = () => {
  const { data: profiles } = useProfiles();
  const { data: categories } = useCategories({ fallback: categoryOptions });

  const categoryFilterOptions = useMemo(() => {
    return ["All", ...categories.map((option) => option.label)];
  }, [categories]);

  return {
    profiles,
    categories,
    categoryFilterOptions,
  };
};
