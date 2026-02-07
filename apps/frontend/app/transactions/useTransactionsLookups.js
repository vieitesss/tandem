import { useMemo } from "react";

import { resolveCategoryIcon } from "../shared/categoryIcons";
import { useCategories } from "../shared/hooks/useCategories";
import { useProfiles } from "../shared/hooks/useProfiles";
import { categoryOptions } from "../shared/transactions";

export const useTransactionsLookups = () => {
  const { data: profiles } = useProfiles();
  const { data: categories } = useCategories({ fallback: categoryOptions });

  const categoryFilterOptions = useMemo(() => {
    return [
      { value: "All", label: "All", icon: "" },
      ...categories.map((option) => ({
        value: option.label,
        label: option.label,
        icon: resolveCategoryIcon(option.icon || ""),
      })),
    ];
  }, [categories]);

  return {
    profiles,
    categories,
    categoryFilterOptions,
  };
};
