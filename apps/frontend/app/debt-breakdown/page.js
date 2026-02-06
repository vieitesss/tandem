"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import SecondaryActions, { SecondaryLink } from "../shared/SecondaryActions";
import { fetchJson } from "../shared/api";
import { useRealtimeUpdates } from "../shared/useRealtimeUpdates";
import Tooltip from "../shared/Tooltip";
import { formatCurrency, formatMonthLabel } from "../shared/format";
import { InlineMessage, PageHeader, PageShell, SectionCard } from "../shared/PageLayout";

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

const getMonthKey = (dateString) => {
  if (!dateString) return "unknown";
  return dateString.slice(0, 7);
};

const groupByMonth = (items) => {
  const groups = new Map();

  items.forEach((item) => {
    const monthKey = getMonthKey(item.date);
    if (!groups.has(monthKey)) {
      groups.set(monthKey, []);
    }
    groups.get(monthKey).push(item);
  });

  return Array.from(groups.keys())
    .sort((a, b) => b.localeCompare(a))
    .map((month) => ({ month, items: groups.get(month) }));
};

export default function DebtBreakdownPage() {
  const [debtSummary, setDebtSummary] = useState({
    state: "idle",
    message: "",
    data: null,
  });

  const apiBaseUrl = "/api";

  const fetchDebtSummary = useCallback(() => {
    setDebtSummary({ state: "loading", message: "", data: null });

    return fetchJson(`${apiBaseUrl}/debt-summary`)
      .then(({ data }) => {
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
  }, [apiBaseUrl]);

  useEffect(() => {
    fetchDebtSummary();
  }, [fetchDebtSummary]);

  useRealtimeUpdates({
    tables: ["transactions", "transaction_splits"],
    onRefresh: fetchDebtSummary,
    channelName: "debt-breakdown-updates",
    preserveScroll: true,
  });

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

  const customSplitRowsByMonth = useMemo(() => {
    const rows = Array.isArray(debtDetails.custom_splits)
      ? debtDetails.custom_splits
      : [];

    const processedRows = rows
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

    return groupByMonth(processedRows);
  }, [debtDetails.custom_splits, profileMap]);

  const owedRowsByMonth = useMemo(() => {
    const rows = Array.isArray(debtDetails.owed_transactions)
      ? debtDetails.owed_transactions
      : [];

    const processedRows = rows
      .map((transaction) => ({
        ...transaction,
        payerName: profileMap.get(transaction.payer_id)?.display_name || "Unknown",
        beneficiaryName:
          profileMap.get(transaction.beneficiary_id)?.display_name || "Unknown",
      }))
      .sort(sortByDateDesc);

    return groupByMonth(processedRows);
  }, [debtDetails.owed_transactions, profileMap]);

  const liquidationRowsByMonth = useMemo(() => {
    const rows = Array.isArray(debtDetails.liquidations) ? debtDetails.liquidations : [];

    const processedRows = rows
      .map((transaction) => ({
        ...transaction,
        payerName: profileMap.get(transaction.payer_id)?.display_name || "Unknown",
        beneficiaryName:
          profileMap.get(transaction.beneficiary_id)?.display_name || "Unknown",
      }))
      .sort(sortByDateDesc);

    return groupByMonth(processedRows);
  }, [debtDetails.liquidations, profileMap]);

  let debtLine = "All settled up.";

  if (debtSummary.state === "loading") {
    debtLine = "Calculating balances...";
  } else if (debtSummary.state === "error") {
    debtLine = "Unable to calculate debt.";
  } else if (debtBalance?.amount) {
    debtLine = `${
      profileMap.get(debtBalance.from_profile_id)?.display_name || "Partner 1"
    } owes ${formatCurrency(debtBalance.amount)} to ${
      profileMap.get(debtBalance.to_profile_id)?.display_name || "Partner 2"
    }`;
  }

  return (
    <PageShell>
      <PageHeader
        title="Debt Breakdown"
        description="Every number is shown with its source: expenses paid, custom split shares, owed transactions, and liquidations."
        eyebrow="Analysis"
        currentPage="transactions"
      >
        <SecondaryActions>
          <SecondaryLink
            href="/transactions"
            label="Overview"
            icon={
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.489 2.386a.75.75 0 00-.978 0L3.01 7.81a.75.75 0 00.48 1.315h.76v6.125a.75.75 0 00.75.75H8.5a.75.75 0 00.75-.75V11h1.5v4.25a.75.75 0 00.75.75H15a.75.75 0 00.75-.75V9.125h.76a.75.75 0 00.48-1.315l-6.5-5.424z" />
              </svg>
            }
          />
          <SecondaryLink
            href="/timeline"
            label="Timeline"
            icon={
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" />
              </svg>
            }
          />
          <SecondaryLink
            href="/person-summary"
            label="Person Summary"
            icon={
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
                <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
              </svg>
            }
          />
          <SecondaryLink
            href="/debt-breakdown"
            label="Debt Breakdown"
            icon={
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
              </svg>
            }
          />
        </SecondaryActions>
      </PageHeader>

      <SectionCard className="p-6">
        <div className="space-y-2">
          <p className="text-sm text-cream-200 font-medium leading-relaxed">
            Net = what was paid - what had to be paid - what was received.
          </p>
          <p className="text-sm text-cream-300 font-medium">{debtLine}</p>
          <p className="text-xs text-cream-300 font-medium">All-time</p>
        </div>
      </SectionCard>

      {debtSummary.state === "loading" ? (
        <InlineMessage tone="muted">Loading debt breakdown...</InlineMessage>
      ) : null}
      {debtSummary.state === "error" ? (
        <InlineMessage tone="error">{debtSummary.message}</InlineMessage>
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
          {customSplitRowsByMonth.length === 0 ? (
            <p className="text-sm text-cream-100/60 font-medium">No custom split expenses yet.</p>
          ) : (
            <div className="space-y-6">
              {customSplitRowsByMonth.map(({ month, items }) => (
                <div key={month} className="space-y-3">
                  <h3 className="text-sm font-display font-semibold text-cream-100/70 tracking-tight">
                    {month === "unknown" ? "Unknown date" : formatMonthLabel(month)}
                  </h3>
                  <div className="space-y-3">
                    {items.map((transaction) => (
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
                              Paid by{" "}
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
            {owedRowsByMonth.length === 0 ? (
              <p className="text-sm text-cream-100/60 font-medium">No owed transactions.</p>
            ) : (
              <div className="space-y-6">
                {owedRowsByMonth.map(({ month, items }) => (
                  <div key={month} className="space-y-3">
                    <h3 className="text-sm font-display font-semibold text-cream-100/70 tracking-tight">
                      {month === "unknown" ? "Unknown date" : formatMonthLabel(month)}
                    </h3>
                    <div className="space-y-3">
                      {items.map((transaction) => (
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
                                Paid by {transaction.payerName} for {transaction.beneficiaryName}
                              </p>
                            </div>
                            <div className="text-sm font-mono font-semibold text-cream-50">
                              {formatCurrency(transaction.amount)}
                            </div>
                          </div>
                        </div>
                      ))}
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
            {liquidationRowsByMonth.length === 0 ? (
              <p className="text-sm text-cream-100/60 font-medium">No liquidations yet.</p>
            ) : (
              <div className="space-y-6">
                {liquidationRowsByMonth.map(({ month, items }) => (
                  <div key={month} className="space-y-3">
                    <h3 className="text-sm font-display font-semibold text-cream-100/70 tracking-tight">
                      {month === "unknown" ? "Unknown date" : formatMonthLabel(month)}
                    </h3>
                    <div className="space-y-3">
                      {items.map((transaction) => (
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
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      ) : null}
    </PageShell>
  );
}
