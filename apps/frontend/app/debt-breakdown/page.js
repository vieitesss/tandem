"use client";

import { useEffect, useMemo, useState } from "react";

import IconLinkButton from "../shared/IconLinkButton";
import Tooltip from "../shared/Tooltip";
import { formatCurrency, formatShortDate } from "../shared/format";

const getTitleForTransaction = (transaction) => {
  if (!transaction) {
    return "Unnamed";
  }

  if (transaction.note) {
    return transaction.note;
  }

  if (transaction.category) {
    return transaction.category;
  }

  return "No note";
};

const sortByDateDesc = (left, right) => {
  const leftDate = left?.date ? new Date(left.date).getTime() : 0;
  const rightDate = right?.date ? new Date(right.date).getTime() : 0;
  return rightDate - leftDate;
};

export default function DebtBreakdownPage() {
  const [debtFromDate, setDebtFromDate] = useState(() => {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    return start.toISOString().slice(0, 10);
  });
  const [debtSummary, setDebtSummary] = useState({
    state: "idle",
    message: "",
    data: null,
  });

  const apiBaseUrl = "/api";

  useEffect(() => {
    const updateFromParam = () => {
      const params = new URLSearchParams(window.location.search);
      const fromParam = params.get("from");
      if (fromParam) {
        setDebtFromDate(fromParam);
      }
    };

    updateFromParam();

    window.addEventListener("popstate", updateFromParam);
    return () => window.removeEventListener("popstate", updateFromParam);
  }, []);

  useEffect(() => {
    if (!debtFromDate) {
      return;
    }

    setDebtSummary({ state: "loading", message: "", data: null });

    fetch(`${apiBaseUrl}/debt-summary?from=${encodeURIComponent(debtFromDate)}`)
      .then((response) => response.json())
      .then((data) => {
        if (data?.error) {
          setDebtSummary({ state: "error", message: data.error, data: null });
          return;
        }

        setDebtSummary({ state: "idle", message: "", data });
      })
      .catch(() => {
        setDebtSummary({
          state: "error",
          message: "Failed to load debt breakdown.",
          data: null,
        });
      });
  }, [apiBaseUrl, debtFromDate]);

  const debtProfiles = debtSummary.data?.profiles || [];
  const debtExpenses = debtSummary.data?.expenses_by_profile || {};
  const debtCustomSplitPaid = debtSummary.data?.custom_split_paid_by_profile || {};
  const debtCustomSplitShare = debtSummary.data?.custom_split_share_by_profile || {};
  const debtOwedTransactions = debtSummary.data?.owed_transactions_by_profile || {};
  const debtOwedPaid = debtSummary.data?.owed_paid_by_profile || {};
  const debtLiquidations = debtSummary.data?.liquidations_by_profile || {};
  const debtLiquidationsReceived =
    debtSummary.data?.liquidations_received_by_profile || {};
  const debtNet = debtSummary.data?.net_by_profile || {};
  const debtBalance = debtSummary.data?.balance || {};
  const debtDetails = debtSummary.data?.details || {};

  const debtProfileLabels = debtProfiles.map((profile) => {
    const expenses = Number(debtExpenses[profile.id] || 0);
    const customSplitPaid = Number(debtCustomSplitPaid[profile.id] || 0);
    const customSplitShare = Number(debtCustomSplitShare[profile.id] || 0);
    const owedTransactions = Number(debtOwedTransactions[profile.id] || 0);
    const owedPaid = Number(debtOwedPaid[profile.id] || 0);
    const liquidationsPaid = Number(debtLiquidations[profile.id] || 0);
    const liquidationsReceived = Number(debtLiquidationsReceived[profile.id] || 0);
    const paidTotal = customSplitPaid + owedPaid + liquidationsPaid;
    const toPayTotal = customSplitShare + owedTransactions;
    const receivedTotal = liquidationsReceived;

    return {
      ...profile,
      expenses,
      customSplitPaid,
      customSplitShare,
      owedTransactions,
      owedPaid,
      liquidationsPaid,
      liquidationsReceived,
      paidTotal,
      toPayTotal,
      receivedTotal,
      net: Number(debtNet[profile.id] || 0),
    };
  });

  const profileMap = useMemo(
    () => new Map(debtProfiles.map((profile) => [profile.id, profile])),
    [debtProfiles]
  );

  const customSplitRows = useMemo(() => {
    const rows = Array.isArray(debtDetails.custom_splits)
      ? debtDetails.custom_splits
      : [];

    return rows
      .map((transaction) => {
        const splitTotal = Array.isArray(transaction.splits)
          ? transaction.splits.reduce((sum, split) => sum + Number(split.amount || 0), 0)
          : 0;
        const splits = Array.isArray(transaction.splits)
          ? transaction.splits.map((split) => {
              const percent = splitTotal
                ? Math.round((Number(split.amount || 0) / splitTotal) * 100)
                : 0;
              const profile = profileMap.get(split.user_id);
              return {
                id: split.user_id,
                amount: Number(split.amount || 0),
                percent,
                name: profile?.display_name || split.user_id,
              };
            })
          : [];

        return {
          ...transaction,
          splits,
        };
      })
      .sort(sortByDateDesc);
  }, [debtDetails.custom_splits, profileMap]);

  const owedRows = useMemo(() => {
    const rows = Array.isArray(debtDetails.owed_transactions)
      ? debtDetails.owed_transactions
      : [];

    return rows
      .map((transaction) => ({
        ...transaction,
        payerName: profileMap.get(transaction.payer_id)?.display_name || "Unknown",
        beneficiaryName:
          profileMap.get(transaction.beneficiary_id)?.display_name || "Unknown",
      }))
      .sort(sortByDateDesc);
  }, [debtDetails.owed_transactions, profileMap]);

  const liquidationRows = useMemo(() => {
    const rows = Array.isArray(debtDetails.liquidations) ? debtDetails.liquidations : [];

    return rows
      .map((transaction) => ({
        ...transaction,
        payerName: profileMap.get(transaction.payer_id)?.display_name || "Unknown",
        beneficiaryName:
          profileMap.get(transaction.beneficiary_id)?.display_name || "Unknown",
      }))
      .sort(sortByDateDesc);
  }, [debtDetails.liquidations, profileMap]);

  let debtLine = "All settled up.";

  if (debtSummary.state === "loading") {
    debtLine = "Calculating balances...";
  } else if (debtSummary.state === "error") {
    debtLine = "Unable to calculate debt.";
  } else if (debtBalance?.amount) {
    debtLine = `${
      profileMap.get(debtBalance.from_profile_id)?.display_name || "Partner 1"
    } owed ${formatCurrency(debtBalance.amount)} to ${
      profileMap.get(debtBalance.to_profile_id)?.display_name || "Partner 2"
    }`;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 pt-8 pb-[calc(6rem+env(safe-area-inset-bottom))] md:p-8 md:pt-12">
      <header className="space-y-5 animate-fade-in">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cream-500/20 to-cream-600/10 border border-cream-500/20 shadow-glow-sm md:h-12 md:w-12">
              <img
                src="/icon.png"
                alt="Tandem"
                className="h-7 w-7 md:h-8 md:w-8"
              />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-cream-100/50 font-semibold">
                Debt Breakdown
              </p>
              <h1 className="text-2xl font-display font-semibold text-cream-50 tracking-tight md:text-3xl">{debtLine}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <IconLinkButton href="/transactions" label="Back to transactions">
              <svg
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M7.75 4.75a.75.75 0 00-1.06 0l-4 4a.75.75 0 000 1.06l4 4a.75.75 0 001.06-1.06L5.06 10l2.69-2.69a.75.75 0 000-1.06z" />
                <path d="M17.25 10a.75.75 0 01-.75.75H5.5a.75.75 0 010-1.5h11a.75.75 0 01.75.75z" />
              </svg>
            </IconLinkButton>
          </div>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-cream-500/15 bg-obsidian-800/40 p-6 shadow-card backdrop-blur-sm">
          <div className="space-y-2">
            <p className="text-sm text-cream-100 font-medium leading-relaxed">
              Every number is shown with its source: expenses paid, custom split
              shares, owed transactions, and liquidations.
            </p>
            <p className="text-xs text-cream-100/60 font-medium">
              Net = what was paid - what had to be paid - what was received
            </p>
            <p className="text-xs text-cream-100/60 font-medium">
              From {formatShortDate(debtFromDate)} onward
            </p>
          </div>
          <label className="space-y-2 text-xs font-medium text-cream-200 tracking-wide">
            From date
            <input
              className="w-full min-w-[180px] rounded-lg border border-cream-500/20 bg-obsidian-900/70 px-3 py-2 text-sm text-cream-50 hover:border-cream-500/30 focus:outline-none focus:ring-2 focus:ring-cream-500/30 transition-all duration-200"
              type="date"
              value={debtFromDate}
              onChange={(event) => {
                if (event.target.value) {
                  setDebtFromDate(event.target.value);
                }
              }}
            />
          </label>
        </div>
      </header>

      {debtSummary.state === "loading" ? (
        <p className="text-sm text-cream-100/60 font-medium">Loading debt breakdown...</p>
      ) : null}
      {debtSummary.state === "error" ? (
        <p className="text-sm text-coral-300 font-medium">{debtSummary.message}</p>
      ) : null}

      {debtSummary.state === "idle" ? (
        <section className="grid gap-6 md:grid-cols-2 animate-slide-up stagger-2">
          {debtProfileLabels.map((profile) => (
            <div
              key={profile.id}
              className="space-y-4 rounded-2xl border border-cream-500/15 bg-obsidian-800/40 p-5 shadow-card backdrop-blur-sm"
            >
              <div className="text-sm font-display font-semibold uppercase tracking-wider text-cream-100/70">
                {profile.display_name || profile.id}
              </div>
              <div className="space-y-2 rounded-xl border border-cream-500/10 bg-obsidian-800/55 p-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-cream-100/50">
                  What was paid
                </div>
                <div className="flex items-center justify-between text-sm">
                  <Tooltip label="Total amount this person paid on transactions split as custom.">
                    <span className="text-cream-100/60 font-medium">Custom split paid</span>
                  </Tooltip>
                  <span className="text-cream-50 font-mono">
                    {formatCurrency(profile.customSplitPaid)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-cream-100/60 font-medium">Owed paid (for others)</span>
                  <span className="text-cream-50 font-mono">
                    {formatCurrency(profile.owedPaid)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-cream-100/60 font-medium">Liquidations paid</span>
                  <span className="text-cream-50 font-mono">
                    {formatCurrency(profile.liquidationsPaid)}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-cream-500/10 pt-2 text-sm">
                  <span className="text-cream-100 font-semibold">Paid total</span>
                  <span className="text-cream-50 font-mono font-semibold">
                    {formatCurrency(profile.paidTotal)}
                  </span>
                </div>
              </div>
              <div className="space-y-2 rounded-xl border border-cream-500/10 bg-obsidian-800/55 p-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-cream-100/50">
                  What had to be paid
                </div>
                <div className="flex items-center justify-between text-sm">
                  <Tooltip label="Total share this person should cover based on custom split percentages.">
                    <span className="text-cream-100/60 font-medium">Custom split share</span>
                  </Tooltip>
                  <span className="text-cream-50 font-mono">
                    {formatCurrency(profile.customSplitShare)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-cream-100/60 font-medium">Owed expenses</span>
                  <span className="text-cream-50 font-mono">
                    {formatCurrency(profile.owedTransactions)}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-cream-500/10 pt-2 text-sm">
                  <span className="text-cream-100 font-semibold">To pay total</span>
                  <span className="text-cream-50 font-mono font-semibold">
                    {formatCurrency(profile.toPayTotal)}
                  </span>
                </div>
              </div>
              <div className="space-y-2 rounded-xl border border-cream-500/10 bg-obsidian-800/55 p-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-cream-100/50">
                  What was received
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-cream-100/60 font-medium">Liquidations received</span>
                  <span className="text-cream-50 font-mono">
                    {formatCurrency(profile.liquidationsReceived)}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-cream-500/10 pt-2 text-sm">
                  <span className="text-cream-100 font-semibold">Received total</span>
                  <span className="text-cream-50 font-mono font-semibold">
                    {formatCurrency(profile.receivedTotal)}
                  </span>
                </div>
              </div>
              <div className="rounded-xl border border-cream-500/10 bg-obsidian-800/55 p-3 text-xs text-cream-100/60">
                <div className="flex items-center justify-between text-sm text-cream-100 font-semibold">
                  <span>Net position</span>
                  <span className="text-cream-50 font-mono font-semibold">{formatCurrency(profile.net)}</span>
                </div>
                <p className="mt-2 text-xs text-cream-100/50 font-medium">
                  {formatCurrency(profile.paidTotal)} -
                  {formatCurrency(profile.toPayTotal)} -
                  {formatCurrency(profile.receivedTotal)} =
                  {formatCurrency(profile.net)}
                </p>
              </div>
            </div>
          ))}
        </section>
      ) : null}

      {debtSummary.state === "idle" ? (
        <section className="space-y-5 rounded-2xl border border-cream-500/15 bg-obsidian-800/40 p-6 shadow-card backdrop-blur-sm animate-slide-up stagger-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-cream-100/50 font-semibold">
              Custom Split Details
            </p>
            <h2 className="text-xl font-display font-semibold text-cream-50 tracking-tight">
              How custom splits are shared
            </h2>
          </div>
          {customSplitRows.length === 0 ? (
            <p className="text-sm text-cream-100/60 font-medium">No custom split expenses yet.</p>
          ) : (
            <div className="space-y-3">
              {customSplitRows.map((transaction) => (
                <div
                  key={transaction.id}
                  className="space-y-2 rounded-xl border border-cream-500/10 bg-obsidian-800/55 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <div>
                      <p className="text-cream-50 font-medium">
                        {getTitleForTransaction(transaction)}
                      </p>
                      <p className="text-xs text-cream-100/50 font-medium">
                        {formatShortDate(transaction.date)} - Paid by {" "}
                        {profileMap.get(transaction.payer_id)?.display_name ||
                          transaction.payer_id ||
                          "Unknown"}
                      </p>
                    </div>
                    <div className="text-sm font-mono font-semibold text-cream-50">
                      {formatCurrency(transaction.amount)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {transaction.splits.length === 0 ? (
                      <p className="text-xs text-cream-100/50 font-medium">
                        No custom split rows recorded.
                      </p>
                    ) : (
                      transaction.splits.map((split) => (
                        <div
                          key={`${transaction.id}-${split.id}`}
                          className="flex items-center justify-between text-xs text-cream-100/60 font-medium"
                        >
                          <span>
                            {split.name} - {split.percent}% share
                          </span>
                          <span className="text-cream-50 font-mono">
                            {formatCurrency(split.amount)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {debtSummary.state === "idle" ? (
        <section className="grid gap-6 md:grid-cols-2 animate-slide-up stagger-4">
          <div className="space-y-5 rounded-2xl border border-cream-500/15 bg-obsidian-800/40 p-6 shadow-card backdrop-blur-sm">
            <div>
              <p className="text-xs uppercase tracking-wider text-cream-100/50 font-semibold">
                Owed Transactions
              </p>
              <h2 className="text-xl font-display font-semibold text-cream-50 tracking-tight">
                Expenses paid for someone else
              </h2>
            </div>
            {owedRows.length === 0 ? (
              <p className="text-sm text-cream-100/60 font-medium">No owed transactions.</p>
            ) : (
              <div className="space-y-3">
                {owedRows.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="rounded-xl border border-cream-500/10 bg-obsidian-800/55 p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <div>
                        <p className="text-cream-50 font-medium">
                          {getTitleForTransaction(transaction)}
                        </p>
                        <p className="text-xs text-cream-100/50 font-medium">
                          {formatShortDate(transaction.date)} - Paid by {" "}
                          {transaction.payerName} for {transaction.beneficiaryName}
                        </p>
                      </div>
                      <div className="text-sm font-mono font-semibold text-cream-50">
                        {formatCurrency(transaction.amount)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-5 rounded-2xl border border-cream-500/15 bg-obsidian-800/40 p-6 shadow-card backdrop-blur-sm">
            <div>
              <p className="text-xs uppercase tracking-wider text-cream-100/50 font-semibold">
                Liquidations
              </p>
              <h2 className="text-xl font-display font-semibold text-cream-50 tracking-tight">
                Payments that settled up
              </h2>
            </div>
            {liquidationRows.length === 0 ? (
              <p className="text-sm text-cream-100/60 font-medium">No liquidations yet.</p>
            ) : (
              <div className="space-y-3">
                {liquidationRows.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="rounded-xl border border-cream-500/10 bg-obsidian-800/55 p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <div>
                        <p className="text-cream-50 font-medium">
                          {getTitleForTransaction(transaction)}
                        </p>
                        <p className="text-xs text-cream-100/50 font-medium">
                          {formatShortDate(transaction.date)} - {" "}
                          {transaction.payerName} paid {transaction.beneficiaryName}
                        </p>
                      </div>
                      <div className="text-sm font-mono font-semibold text-cream-50">
                        {formatCurrency(transaction.amount)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      ) : null}
    </main>
  );
}
