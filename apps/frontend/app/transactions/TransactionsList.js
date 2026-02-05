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
}) {
  return groupedTransactions.map((group) => {
    const monthLabel =
      group.month === "unknown" ? "Unknown date" : formatMonthLabel(group.month);

    return (
      <div key={group.month} className="space-y-3 animate-slide-up">
        <div className="text-base font-display font-semibold tracking-tight text-cream-100">
          {monthLabel}
        </div>
        <div className="grid grid-cols-[50px_100px_1fr_80px] gap-2 px-3 text-xs font-semibold uppercase tracking-wider text-cream-400 md:grid-cols-[60px_120px_140px_1fr_100px_90px_72px]">
          <span>Day</span>
          <span>Paid by</span>
          <span className="md:hidden">Note</span>
          <span className="hidden md:block">Category</span>
          <span className="hidden md:block">Note</span>
          <span className="hidden md:block">Split</span>
          <span className="text-right">Amount</span>
        </div>
        <div className="divide-y divide-obsidian-600 rounded-3xl border border-obsidian-600/80 bg-obsidian-800 shadow-card">
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
            />
          ))}
        </div>
      </div>
    );
  });
}
