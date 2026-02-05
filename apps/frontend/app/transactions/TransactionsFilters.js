import SelectField from "../shared/SelectField";
import { formatMonthLabel } from "../shared/format";
import { typeOptions } from "../shared/transactions";

export default function TransactionsFilters({
  filters,
  monthOptions,
  profiles,
  categoryFilterOptions,
  onFilterChange,
  onMonthChange,
}) {
  return (
    <section className="animate-slide-up stagger-2 grid gap-4 rounded-3xl border border-obsidian-600/80 bg-obsidian-800 p-6 shadow-card md:grid-cols-5">
      <label className="space-y-2 text-sm font-medium tracking-wide text-cream-200">
        Month
        <SelectField
          className="w-full appearance-none rounded-lg border border-obsidian-600 bg-obsidian-900 px-3 py-2 pr-9 text-sm text-cream-50 transition-all duration-200 hover:border-cream-500/30 focus:outline-none focus:ring-2 focus:ring-cream-500/30"
          value={filters.month}
          onChange={onMonthChange}
        >
          <option value="">All months</option>
          {monthOptions.map((month) => (
            <option key={month} value={month}>
              {formatMonthLabel(month)}
            </option>
          ))}
        </SelectField>
      </label>
      <label className="space-y-2 text-sm font-medium tracking-wide text-cream-200">
        Type
        <SelectField
          className="w-full appearance-none rounded-lg border border-obsidian-600 bg-obsidian-900 px-3 py-2 pr-9 text-sm text-cream-50 transition-all duration-200 hover:border-cream-500/30 focus:outline-none focus:ring-2 focus:ring-cream-500/30"
          value={filters.type}
          onChange={(event) => onFilterChange("type", event.target.value)}
        >
          {typeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectField>
      </label>
      <label className="space-y-2 text-sm font-medium tracking-wide text-cream-200">
        Category
        <SelectField
          className="w-full appearance-none rounded-lg border border-obsidian-600 bg-obsidian-900 px-3 py-2 pr-9 text-sm text-cream-50 transition-all duration-200 hover:border-cream-500/30 focus:outline-none focus:ring-2 focus:ring-cream-500/30"
          value={filters.category}
          onChange={(event) => onFilterChange("category", event.target.value)}
        >
          {categoryFilterOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </SelectField>
      </label>
      <label className="space-y-2 text-sm font-medium tracking-wide text-cream-200">
        Paid by
        <SelectField
          className="w-full appearance-none rounded-lg border border-obsidian-600 bg-obsidian-900 px-3 py-2 pr-9 text-sm text-cream-50 transition-all duration-200 hover:border-cream-500/30 focus:outline-none focus:ring-2 focus:ring-cream-500/30"
          value={filters.payerId}
          onChange={(event) => onFilterChange("payerId", event.target.value)}
        >
          <option value="">All payers</option>
          {profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.display_name || profile.id}
            </option>
          ))}
        </SelectField>
      </label>
      <label className="space-y-2 text-sm font-medium tracking-wide text-cream-200">
        Split type
        <SelectField
          className="w-full appearance-none rounded-lg border border-obsidian-600 bg-obsidian-900 px-3 py-2 pr-9 text-sm text-cream-50 transition-all duration-200 hover:border-cream-500/30 focus:outline-none focus:ring-2 focus:ring-cream-500/30"
          value={filters.split}
          onChange={(event) => onFilterChange("split", event.target.value)}
        >
          <option value="ALL">All splits</option>
          <option value="PERSONAL">Personal</option>
          <option value="OWED">Owed</option>
          <option value="CUSTOM">Custom</option>
        </SelectField>
      </label>
    </section>
  );
}
