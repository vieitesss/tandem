import Link from "next/link";

import { formatCurrency } from "../shared/format";

export default function DebtSummaryCard({
  debtLine,
  debtSummary,
  embedded = false,
  fillHeight = false,
}) {
  const wrapperClassName = embedded
    ? `rounded-2xl border border-obsidian-600/80 bg-obsidian-800 p-4 shadow-card ${
        fillHeight ? "xl:h-full" : "h-fit self-start"
      }`
    : "animate-slide-up stagger-1 h-fit self-start rounded-2xl border border-obsidian-600/80 bg-obsidian-800 p-4 shadow-card";

  const profiles = Array.isArray(debtSummary.data?.profiles)
    ? debtSummary.data.profiles
    : [];
  const netByProfile = debtSummary.data?.net_by_profile || {};
  const balance = debtSummary.data?.balance || {};

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

  const settleUpHref = (() => {
    const amount = Number(balance.amount || 0);
    const fromProfileId = balance.from_profile_id;
    const toProfileId = balance.to_profile_id;

    if (debtSummary.state !== "idle" || amount <= 0 || !fromProfileId || !toProfileId) {
      return "";
    }

    const params = new URLSearchParams({
      type: "LIQUIDATION",
      payer_id: String(fromProfileId),
      beneficiary_id: String(toProfileId),
      amount: amount.toFixed(2),
      note: "Settle up balance",
    });

    return `/?${params.toString()}`;
  })();

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
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-obsidian-600 bg-obsidian-900 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-cream-300">
            All-time
          </span>
          {settleUpHref ? (
            <Link
              href={settleUpHref}
              className="rounded-full border border-cream-500/35 bg-cream-500 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white transition-colors duration-200 hover:bg-cream-600"
            >
              Settle up
            </Link>
          ) : null}
        </div>
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
        <div className="mt-3 border-t border-obsidian-600 pt-3 text-xs text-cream-300">
          {netLine ? <p className="font-medium text-cream-200">{netLine}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
