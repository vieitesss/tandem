import { formatMonthLabel } from "../shared/format";
import TransactionRow from "./TransactionRow";

export default function TransactionsList({
  groupedTransactions,
  profiles,
  categories,
  savingId,
  deletingId,
  onSave,
  onDelete,
  activePayerId,
}) {
  return groupedTransactions.map((group) => {
    const monthLabel =
      group.month === "unknown" ? "Unknown date" : formatMonthLabel(group.month);

    return (
      <div key={group.month} className="space-y-3 animate-slide-up">
        <div className="sticky top-0 z-20 border-y border-obsidian-600 bg-obsidian-900 px-1 py-2 text-center text-base font-display font-semibold tracking-tight text-cream-100 md:text-left">
          {monthLabel}
        </div>
        <div className="grid grid-cols-12 items-center gap-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.11em] text-cream-400 md:grid-cols-[70px_130px_140px_1fr_100px_96px_84px] md:gap-2 md:px-4 md:text-[11px] md:tracking-[0.12em]">
          <span className="col-span-2 md:col-auto">Day</span>
          <span className="col-span-3 md:col-auto">Paid by</span>
          <span className="col-span-4 md:hidden">Category</span>
          <span className="hidden md:block">Category</span>
          <span className="hidden md:block">Note</span>
          <span className="hidden md:block">Split</span>
          <span className="col-span-3 text-right tabular-nums md:col-auto">Amount</span>
        </div>
        <div className="divide-y divide-obsidian-600 border-y border-obsidian-600 bg-obsidian-800">
          {group.items.map((transaction) => (
            <TransactionRow
              key={transaction.id}
              transaction={transaction}
              profiles={profiles}
              categoryOptions={categories}
              onSave={onSave}
              onDelete={onDelete}
              isSaving={savingId === transaction.id}
              isDeleting={deletingId === transaction.id}
              activePayerId={activePayerId}
            />
          ))}
        </div>
      </div>
    );
  });
}
