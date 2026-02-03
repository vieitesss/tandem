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
    <section className="grid gap-4 rounded-2xl border border-cream-500/15 bg-obsidian-800/40 p-6 shadow-card backdrop-blur-sm md:grid-cols-5 animate-slide-up stagger-2">
      <label className="space-y-2 text-sm font-medium text-cream-200 tracking-wide">
        Month
        <SelectField
          className="w-full appearance-none rounded-lg border border-cream-500/20 bg-obsidian-950/80 px-3 py-2 pr-9 text-sm text-cream-50 hover:border-cream-500/30 focus:outline-none focus:ring-2 focus:ring-cream-500/30 transition-all duration-200"
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
      <label className="space-y-2 text-sm font-medium text-cream-200 tracking-wide">
        Type
        <SelectField
          className="w-full appearance-none rounded-lg border border-cream-500/20 bg-obsidian-950/80 px-3 py-2 pr-9 text-sm text-cream-50 hover:border-cream-500/30 focus:outline-none focus:ring-2 focus:ring-cream-500/30 transition-all duration-200"
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
      <label className="space-y-2 text-sm font-medium text-cream-200 tracking-wide">
        Category
        <SelectField
          className="w-full appearance-none rounded-lg border border-cream-500/20 bg-obsidian-950/80 px-3 py-2 pr-9 text-sm text-cream-50 hover:border-cream-500/30 focus:outline-none focus:ring-2 focus:ring-cream-500/30 transition-all duration-200"
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
      <label className="space-y-2 text-sm font-medium text-cream-200 tracking-wide">
        Paid by
        <SelectField
          className="w-full appearance-none rounded-lg border border-cream-500/20 bg-obsidian-950/80 px-3 py-2 pr-9 text-sm text-cream-50 hover:border-cream-500/30 focus:outline-none focus:ring-2 focus:ring-cream-500/30 transition-all duration-200"
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
      <label className="space-y-2 text-sm font-medium text-cream-200 tracking-wide">
        Split type
        <SelectField
          className="w-full appearance-none rounded-lg border border-cream-500/20 bg-obsidian-950/80 px-3 py-2 pr-9 text-sm text-cream-50 hover:border-cream-500/30 focus:outline-none focus:ring-2 focus:ring-cream-500/30 transition-all duration-200"
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
