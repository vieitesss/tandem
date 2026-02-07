import { useMemo } from "react";

import { groupByMonth } from "../shared/domain/months";

export const useTransactionsViewModel = ({ transactions, filters }) => {
  const filteredTransactions = useMemo(() => {
    const payerId = filters.payerId ? Number(filters.payerId) : null;

    return transactions.filter((transaction) => {
      if (payerId && transaction.payer_id !== payerId) {
        return false;
      }

      if (filters.split && filters.split !== "ALL") {
        if (transaction.type !== "EXPENSE") {
          return false;
        }

        const splitLabel =
          transaction.split_mode === "none"
            ? "PERSONAL"
            : transaction.split_mode
              ? String(transaction.split_mode).toUpperCase()
              : "";

        if (splitLabel !== filters.split) {
          return false;
        }
      }

      return true;
    });
  }, [filters.payerId, filters.split, transactions]);

  const groupedTransactions = useMemo(() => {
    return groupByMonth(filteredTransactions);
  }, [filteredTransactions]);

  const totalsByType = useMemo(() => {
    const totals = {
      EXPENSE: 0,
      INCOME: 0,
      LIQUIDATION: 0,
    };

    filteredTransactions.forEach((transaction) => {
      const type = transaction.type;
      if (type && Object.prototype.hasOwnProperty.call(totals, type)) {
        totals[type] += Number(transaction.amount) || 0;
      }
    });

    return totals;
  }, [filteredTransactions]);

  const presentTypes = useMemo(() => {
    return Object.entries(totalsByType)
      .filter(([, total]) => total > 0)
      .map(([type]) => type);
  }, [totalsByType]);

  return {
    filteredTransactions,
    groupedTransactions,
    totalsByType,
    presentTypes,
  };
};
