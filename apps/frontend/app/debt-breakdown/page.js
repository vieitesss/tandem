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
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-6 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:p-6">
      <header className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="/icon.png"
              alt="Tandem"
              className="h-8 w-8 md:h-9 md:w-9"
            />
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Debt breakdown
              </p>
              <h1 className="text-2xl font-semibold text-slate-100">{debtLine}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
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
        <div className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
          <div>
            <p className="text-sm text-slate-300">
              Every number is shown with its source: expenses paid, custom split
              shares, owed transactions, and liquidations.
            </p>
            <p className="text-xs text-slate-500">
              Net = what was paid - what had to be paid - what was received.
            </p>
            <p className="text-xs text-slate-500">
              From {formatShortDate(debtFromDate)} onward.
            </p>
          </div>
          <label className="space-y-2 text-xs text-slate-400">
            From date
            <input
              className="w-full min-w-[180px] rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
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
        <p className="text-sm text-slate-400">Loading debt breakdown...</p>
      ) : null}
      {debtSummary.state === "error" ? (
        <p className="text-sm text-rose-300">{debtSummary.message}</p>
      ) : null}

      {debtSummary.state === "idle" ? (
        <section className="grid gap-4 md:grid-cols-2">
          {debtProfileLabels.map((profile) => (
            <div
              key={profile.id}
              className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
            >
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                {profile.display_name || profile.id}
              </div>
              <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  What was paid
                </div>
                <div className="flex items-center justify-between text-sm">
                  <Tooltip label="Total amount this person paid on transactions split as custom.">
                    <span className="text-slate-400">Custom split paid</span>
                  </Tooltip>
                  <span className="text-slate-100">
                    {formatCurrency(profile.customSplitPaid)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Owed paid (for others)</span>
                  <span className="text-slate-100">
                    {formatCurrency(profile.owedPaid)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Liquidations paid</span>
                  <span className="text-slate-100">
                    {formatCurrency(profile.liquidationsPaid)}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-800 pt-2 text-sm">
                  <span className="text-slate-200">Paid total</span>
                  <span className="text-slate-50">
                    {formatCurrency(profile.paidTotal)}
                  </span>
                </div>
              </div>
              <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  What had to be paid
                </div>
                <div className="flex items-center justify-between text-sm">
                  <Tooltip label="Total share this person should cover based on custom split percentages.">
                    <span className="text-slate-400">Custom split share</span>
                  </Tooltip>
                  <span className="text-slate-100">
                    {formatCurrency(profile.customSplitShare)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Owed expenses</span>
                  <span className="text-slate-100">
                    {formatCurrency(profile.owedTransactions)}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-800 pt-2 text-sm">
                  <span className="text-slate-200">To pay total</span>
                  <span className="text-slate-50">
                    {formatCurrency(profile.toPayTotal)}
                  </span>
                </div>
              </div>
              <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  What was received
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Liquidations received</span>
                  <span className="text-slate-100">
                    {formatCurrency(profile.liquidationsReceived)}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-800 pt-2 text-sm">
                  <span className="text-slate-200">Received total</span>
                  <span className="text-slate-50">
                    {formatCurrency(profile.receivedTotal)}
                  </span>
                </div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-400">
                <div className="flex items-center justify-between text-sm text-slate-200">
                  <span>Net position</span>
                  <span className="text-slate-50">{formatCurrency(profile.net)}</span>
                </div>
                <p className="mt-2 text-xs text-slate-500">
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
        <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Custom split details
            </p>
            <h2 className="text-lg font-semibold text-slate-100">
              How custom splits are shared
            </h2>
          </div>
          {customSplitRows.length === 0 ? (
            <p className="text-sm text-slate-400">No custom split expenses yet.</p>
          ) : (
            <div className="space-y-3">
              {customSplitRows.map((transaction) => (
                <div
                  key={transaction.id}
                  className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <div>
                      <p className="text-slate-100">
                        {getTitleForTransaction(transaction)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatShortDate(transaction.date)} - Paid by {" "}
                        {profileMap.get(transaction.payer_id)?.display_name ||
                          transaction.payer_id ||
                          "Unknown"}
                      </p>
                    </div>
                    <div className="text-sm font-semibold text-slate-100">
                      {formatCurrency(transaction.amount)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {transaction.splits.length === 0 ? (
                      <p className="text-xs text-slate-500">
                        No custom split rows recorded.
                      </p>
                    ) : (
                      transaction.splits.map((split) => (
                        <div
                          key={`${transaction.id}-${split.id}`}
                          className="flex items-center justify-between text-xs text-slate-400"
                        >
                          <span>
                            {split.name} - {split.percent}% share
                          </span>
                          <span className="text-slate-100">
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
        <section className="grid gap-4 md:grid-cols-2">
          <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Owed transactions
              </p>
              <h2 className="text-lg font-semibold text-slate-100">
                Expenses paid for someone else
              </h2>
            </div>
            {owedRows.length === 0 ? (
              <p className="text-sm text-slate-400">No owed transactions.</p>
            ) : (
              <div className="space-y-3">
                {owedRows.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="rounded-xl border border-slate-800 bg-slate-950/60 p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <div>
                        <p className="text-slate-100">
                          {getTitleForTransaction(transaction)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatShortDate(transaction.date)} - Paid by {" "}
                          {transaction.payerName} for {transaction.beneficiaryName}
                        </p>
                      </div>
                      <div className="text-sm font-semibold text-slate-100">
                        {formatCurrency(transaction.amount)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Liquidations
              </p>
              <h2 className="text-lg font-semibold text-slate-100">
                Payments that settled up
              </h2>
            </div>
            {liquidationRows.length === 0 ? (
              <p className="text-sm text-slate-400">No liquidations yet.</p>
            ) : (
              <div className="space-y-3">
                {liquidationRows.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="rounded-xl border border-slate-800 bg-slate-950/60 p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <div>
                        <p className="text-slate-100">
                          {getTitleForTransaction(transaction)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatShortDate(transaction.date)} - {" "}
                          {transaction.payerName} paid {transaction.beneficiaryName}
                        </p>
                      </div>
                      <div className="text-sm font-semibold text-slate-100">
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
