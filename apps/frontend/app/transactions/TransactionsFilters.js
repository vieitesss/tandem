"use client";

import { useMemo, useState } from "react";

import AppModal from "../shared/AppModal";
import SelectField from "../shared/SelectField";
import { formatMonthLabel } from "../shared/format";
import { typeOptions } from "../shared/transactions";

const splitLabels = {
  ALL: "All splits",
  PERSONAL: "Personal",
  OWED: "Owed",
  CUSTOM: "Custom",
};

export default function TransactionsFilters({
  filters,
  monthOptions,
  profiles,
  categoryFilterOptions,
  onFilterChange,
  onMonthChange,
}) {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const selectedType =
    typeOptions.find((option) => option.value === filters.type)?.label || "All";
  const selectedPayer = profiles.find(
    (profile) => String(profile.id) === String(filters.payerId)
  )?.display_name;

  const activeFiltersCount =
    (filters.month ? 1 : 0) +
    (filters.type !== "ALL" ? 1 : 0) +
    (filters.category !== "All" ? 1 : 0) +
    (filters.payerId ? 1 : 0) +
    (filters.split !== "ALL" ? 1 : 0);

  const activeFilterChips = useMemo(() => {
    const chips = [];

    if (filters.month) {
      chips.push({
        key: "month",
        label: formatMonthLabel(filters.month),
        onClear: () => onMonthChange({ target: { value: "" } }),
      });
    }

    if (filters.type !== "ALL") {
      chips.push({
        key: "type",
        label: selectedType,
        onClear: () => onFilterChange("type", "ALL"),
      });
    }

    if (filters.category !== "All") {
      chips.push({
        key: "category",
        label: filters.category,
        onClear: () => onFilterChange("category", "All"),
      });
    }

    if (filters.payerId) {
      chips.push({
        key: "payer",
        label: selectedPayer || String(filters.payerId),
        onClear: () => onFilterChange("payerId", ""),
      });
    }

    if (filters.split !== "ALL") {
      chips.push({
        key: "split",
        label: splitLabels[filters.split] || "Split",
        onClear: () => onFilterChange("split", "ALL"),
      });
    }

    return chips;
  }, [
    filters.category,
    filters.month,
    filters.payerId,
    filters.split,
    filters.type,
    onFilterChange,
    onMonthChange,
    selectedPayer,
    selectedType,
  ]);

  const handleMonthPick = (value) => {
    onMonthChange({ target: { value } });
  };

  const clearAllFilters = () => {
    handleMonthPick("");
    onFilterChange("type", "ALL");
    onFilterChange("category", "All");
    onFilterChange("payerId", "");
    onFilterChange("split", "ALL");
  };

  const mobileChipClass =
    "inline-flex min-h-10 items-center rounded-xl px-3 text-sm font-semibold transition-colors";

  const monthActive = Boolean(filters.month);
  const typeActive = filters.type !== "ALL";
  const categoryActive = filters.category !== "All";
  const payerActive = Boolean(filters.payerId);
  const splitActive = filters.split !== "ALL";

  const sectionTitle = (label, isActive) => (
    <span>
      {label}
      {isActive ? <span className="ml-1 text-cream-500">•</span> : null}
    </span>
  );

  return (
    <section className="animate-slide-up stagger-2">
      <div className="-mx-1 flex items-center gap-1.5 overflow-x-auto overflow-y-visible px-1 pt-1.5 pb-0.5">
        <button
          type="button"
          className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-obsidian-700 text-cream-100"
          onClick={() => setIsFiltersOpen(true)}
          aria-label="Open filters"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path d="M3.75 5.75A.75.75 0 014.5 5h11a.75.75 0 010 1.5h-11a.75.75 0 01-.75-.75zm2.5 4a.75.75 0 01.75-.75h6a.75.75 0 010 1.5h-6a.75.75 0 01-.75-.75zm2.5 4a.75.75 0 01.75-.75h1a.75.75 0 010 1.5h-1a.75.75 0 01-.75-.75z" />
          </svg>
          {activeFiltersCount > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-cream-500 px-1 text-[9px] font-semibold leading-none text-white">
              {activeFiltersCount}
            </span>
          ) : null}
        </button>

        {activeFilterChips.map((chip) => (
          <button
            key={chip.key}
            type="button"
            className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg bg-obsidian-700 px-2.5 text-xs font-medium text-cream-100"
            onClick={chip.onClear}
            aria-label={`Clear ${chip.label} filter`}
          >
            <span>{chip.label}</span>
            <span className="text-cream-300">x</span>
          </button>
        ))}
      </div>

      <AppModal
        open={isFiltersOpen}
        title="Filters"
        onClose={() => setIsFiltersOpen(false)}
        maxWidth="max-w-lg"
      >
        <div className="space-y-5">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cream-400">
              {sectionTitle("Month", monthActive)}
            </p>
            <SelectField
              className="w-full appearance-none rounded-xl border border-obsidian-600 bg-obsidian-700 px-3 py-2.5 pr-9 text-sm text-cream-100"
              value={filters.month}
              onChange={(event) => handleMonthPick(event.target.value)}
            >
              <option value="">All months</option>
              {monthOptions.map((month) => (
                <option key={month} value={month}>
                  {formatMonthLabel(month)}
                </option>
              ))}
            </SelectField>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cream-400">
              {sectionTitle("Type", typeActive)}
            </p>
            <div className="flex flex-wrap gap-2">
              {typeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`${mobileChipClass} ${
                    filters.type === option.value
                      ? "bg-cream-500 text-white"
                      : "bg-obsidian-700 text-cream-200"
                  }`}
                  onClick={() => onFilterChange("type", option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cream-400">
              {sectionTitle("Category", categoryActive)}
            </p>
            <SelectField
              className="w-full appearance-none rounded-xl border border-obsidian-600 bg-obsidian-700 px-3 py-2.5 pr-9 text-sm text-cream-100"
              value={filters.category}
              onChange={(event) => onFilterChange("category", event.target.value)}
            >
              {categoryFilterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectField>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cream-400">
              {sectionTitle("Paid by", payerActive)}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={`${mobileChipClass} ${
                  !filters.payerId ? "bg-cream-500 text-white" : "bg-obsidian-700 text-cream-200"
                }`}
                onClick={() => onFilterChange("payerId", "")}
              >
                All payers
              </button>
              {profiles.map((profile) => (
                <button
                  key={profile.id}
                  type="button"
                  className={`${mobileChipClass} ${
                    String(filters.payerId) === String(profile.id)
                      ? "bg-cream-500 text-white"
                      : "bg-obsidian-700 text-cream-200"
                  }`}
                  onClick={() => onFilterChange("payerId", String(profile.id))}
                >
                  {profile.display_name || profile.id}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cream-400">
              {sectionTitle("Split", splitActive)}
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(splitLabels).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`${mobileChipClass} ${
                    filters.split === value
                      ? "bg-cream-500 text-white"
                      : "bg-obsidian-700 text-cream-200"
                  }`}
                  onClick={() => onFilterChange("split", value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 border-t border-obsidian-600 pt-2">
            <button
              type="button"
              className="min-h-11 rounded-xl px-3 text-sm font-semibold text-cream-300"
              onClick={clearAllFilters}
            >
              Clear all
            </button>
            <button
              type="button"
              className="min-h-11 rounded-xl bg-cream-500 px-3 text-sm font-semibold text-white"
              onClick={() => setIsFiltersOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      </AppModal>
    </section>
  );
}
