import { formatCurrency } from "../shared/format";

export default function TransactionsTotals({ presentTypes, totalsByType }) {
  if (!presentTypes || presentTypes.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-cream-500/10 bg-obsidian-800/40 p-5 shadow-card backdrop-blur-sm">
      <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-cream-100/40">
        Visible totals
      </div>
      {presentTypes.length === 1 ? (
        <div className="md:flex md:justify-center">
          <div className="flex items-center justify-between gap-4 md:flex-col md:items-start md:gap-1">
            <span
              className={`text-xs font-medium uppercase tracking-wider ${
                presentTypes[0] === "EXPENSE"
                  ? "text-coral-400"
                  : presentTypes[0] === "INCOME"
                    ? "text-sage-400"
                    : "text-cream-50"
              }`}
            >
              {presentTypes[0] === "EXPENSE"
                ? "Expenses"
                : presentTypes[0] === "INCOME"
                  ? "Income"
                  : "Liquidation"}
            </span>
            <span
              className={`text-base font-mono font-bold ${
                presentTypes[0] === "EXPENSE"
                  ? "text-coral-400"
                  : presentTypes[0] === "INCOME"
                    ? "text-sage-400"
                    : "text-cream-50"
              }`}
            >
              {formatCurrency(totalsByType[presentTypes[0]])}
            </span>
          </div>
        </div>
      ) : (
        <div className="grid gap-y-3 md:grid-cols-3 md:gap-x-6 md:gap-y-0">
          {totalsByType.EXPENSE > 0 ? (
            <div className="flex w-full items-center justify-between gap-4 md:w-auto md:flex-col md:items-start md:justify-self-start md:text-left md:gap-1">
              <span className="text-xs font-medium uppercase tracking-wider text-coral-400">
                Expenses
              </span>
              <span className="font-mono font-bold text-coral-400">
                {formatCurrency(totalsByType.EXPENSE)}
              </span>
            </div>
          ) : null}
          {totalsByType.INCOME > 0 ? (
            <div className="flex w-full items-center justify-between gap-4 md:w-auto md:flex-col md:items-center md:justify-self-center md:text-center md:gap-1">
              <span className="text-xs font-medium uppercase tracking-wider text-sage-400">
                Income
              </span>
              <span className="font-mono font-bold text-sage-400">
                {formatCurrency(totalsByType.INCOME)}
              </span>
            </div>
          ) : null}
          {totalsByType.LIQUIDATION > 0 ? (
            <div className="flex w-full items-center justify-between gap-4 md:w-auto md:flex-col md:items-end md:justify-self-end md:text-right md:gap-1">
              <span className="text-xs font-medium uppercase tracking-wider text-cream-50">
                Liquidation
              </span>
              <span className="font-mono font-bold text-cream-50">
                {formatCurrency(totalsByType.LIQUIDATION)}
              </span>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
