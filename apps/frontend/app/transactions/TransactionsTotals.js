import { formatCurrency } from "../shared/format";

export default function TransactionsTotals({
  presentTypes,
  totalsByType,
  embedded = false,
}) {
  if (!presentTypes || presentTypes.length === 0) {
    return null;
  }

  const totals = [
    {
      key: "EXPENSE",
      label: "Expenses",
      value: totalsByType.EXPENSE || 0,
      dotClassName: "bg-coral-400",
    },
    {
      key: "INCOME",
      label: "Income",
      value: totalsByType.INCOME || 0,
      dotClassName: "bg-sage-300",
    },
    {
      key: "LIQUIDATION",
      label: "Settlement",
      value: totalsByType.LIQUIDATION || 0,
      dotClassName: "bg-cream-400",
    },
  ];
  const visibleTotals = totals.filter((item) => presentTypes.includes(item.key));

  if (visibleTotals.length === 0) {
    return null;
  }

  const wrapperClassName = embedded
    ? "rounded-2xl border border-obsidian-600/80 bg-obsidian-800 p-4 shadow-card"
    : "rounded-2xl border border-obsidian-600/80 bg-obsidian-800 p-4 shadow-card";

  return (
    <div className={wrapperClassName}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cream-400">
          Visible totals
        </p>
        <p className="text-[11px] font-medium text-cream-300">Current filters</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {visibleTotals.map((item) => (
          <div
            key={item.key}
            className="rounded-xl border border-obsidian-600 bg-obsidian-900 px-3 py-2"
          >
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-cream-300">
              <span className={`h-1.5 w-1.5 rounded-full ${item.dotClassName}`} />
              {item.label}
            </p>
            <p className="mt-1 text-sm font-mono font-bold text-cream-50">
              {formatCurrency(item.value)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
