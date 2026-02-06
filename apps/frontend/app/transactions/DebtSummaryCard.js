import { formatCurrency } from "../shared/format";

export default function DebtSummaryCard({
  debtLine,
  debtSummary,
  embedded = false,
  fillHeight = false,
}) {
  const wrapperClassName = embedded
    ? `rounded-2xl border border-obsidian-600 bg-obsidian-900 p-4 ${
        fillHeight ? "xl:h-full" : "h-fit self-start"
      }`
    : "animate-slide-up stagger-1 h-fit self-start rounded-2xl border border-obsidian-600/80 bg-obsidian-800 p-4";

  const profiles = Array.isArray(debtSummary.data?.profiles)
    ? debtSummary.data.profiles
    : [];
  const netByProfile = debtSummary.data?.net_by_profile || {};

  const netLine =
    debtSummary.state === "idle" && profiles.length > 0
      ? `Net positions: ${profiles
          .map((profile) => {
            const netAmount = Number(netByProfile[profile.id] || 0);
            const sign = netAmount > 0 ? "+" : netAmount < 0 ? "-" : "";
            return `${profile.display_name || profile.id || "Profile"} ${sign}${formatCurrency(
              Math.abs(netAmount)
            )}`;
          })
          .join(" | ")}`
      : null;

  return (
    <section className={`${wrapperClassName} flex flex-col`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cream-400">
            Debt summary
          </p>
          <h2 className="text-2xl font-display font-bold tracking-tight text-cream-50 md:text-3xl">
            {debtLine}
          </h2>
        </div>
        <span className="rounded-full border border-obsidian-600 bg-obsidian-900 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-cream-300">
          All-time
        </span>
      </div>
      {debtSummary.state === "loading" ? (
        <p className="mt-2 text-xs font-medium text-cream-300">
          Loading debt summary...
        </p>
      ) : null}
      {debtSummary.state === "error" ? (
        <p className="mt-2 text-xs font-medium text-coral-300">
          {debtSummary.message}
        </p>
      ) : null}
      {debtSummary.state === "idle" && netLine ? (
        <div className="mt-3 space-y-1 rounded-xl border border-obsidian-600 bg-white px-3 py-2 text-xs text-cream-300">
          {netLine ? <p className="font-medium text-cream-200">{netLine}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
