export default function DebtSummaryCard({ debtLine, debtSummary }) {
  return (
    <section className="space-y-4 rounded-2xl border border-cream-500/15 bg-obsidian-800/40 p-6 shadow-card backdrop-blur-sm animate-slide-up stagger-1">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wider text-cream-100/50 font-semibold">
          Debt Summary
        </p>
        <h2 className="text-xl font-display font-semibold text-cream-50 tracking-tight">
          {debtLine}
        </h2>
        <p className="text-xs text-cream-100/60 font-medium">All-time</p>
      </div>
      {debtSummary.state === "loading" ? (
        <p className="text-sm text-cream-100/60 font-medium">
          Loading debt summary...
        </p>
      ) : null}
      {debtSummary.state === "error" ? (
        <p className="text-sm text-coral-300 font-medium">
          {debtSummary.message}
        </p>
      ) : null}
    </section>
  );
}
