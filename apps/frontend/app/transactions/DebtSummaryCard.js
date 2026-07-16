import Link from "next/link";

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

  const balance = debtSummary.data?.balance || {};

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
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-cream-300">
            Settlement balance
          </p>
          <h2 className="text-2xl font-display font-bold tracking-tight text-cream-50 md:text-3xl">
            {debtLine}
          </h2>
          <span className="inline-flex rounded-full border border-obsidian-600 bg-obsidian-900 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-cream-300">
            All-time
          </span>
        </div>
        {settleUpHref ? (
          <Link
            href={settleUpHref}
            className="inline-flex min-h-11 items-center rounded-xl border border-cream-500/35 bg-cream-500 px-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-cream-600"
          >
            Settle up
          </Link>
        ) : null}
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
    </section>
  );
}
