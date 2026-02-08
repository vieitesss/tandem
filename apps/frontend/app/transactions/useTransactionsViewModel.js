import { useMemo } from "react";

import { groupByMonth } from "../shared/domain/months";

export const useTransactionsViewModel = ({ transactions, filters }) => {
  const filteredTransactions = useMemo(() => {
    const payerId = filters.payerId ? Number(filters.payerId) : null;

    return transactions.filter((transaction) => {
      if (payerId) {
        const isSettlement = transaction.type === "LIQUIDATION";
        const matchesPayer = transaction.payer_id === payerId;
        const matchesBeneficiary = isSettlement && transaction.beneficiary_id === payerId;
        
        if (!matchesPayer && !matchesBeneficiary) {
          return false;
        }
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
    const payerId = filters.payerId ? Number(filters.payerId) : null;
    const totals = {
      EXPENSE: 0,
      INCOME: 0,
      LIQUIDATION: 0,
      LIQUIDATION_PAID: 0,
      LIQUIDATION_RECEIVED: 0,
    };

    filteredTransactions.forEach((transaction) => {
      const type = transaction.type;
      const amount = Number(transaction.amount) || 0;
      
      if (type === "LIQUIDATION" && payerId) {
        // When filtering by person, categorize settlements by their perspective
        if (transaction.payer_id === payerId) {
          totals.LIQUIDATION_PAID += amount;
        } else if (transaction.beneficiary_id === payerId) {
          totals.LIQUIDATION_RECEIVED += amount;
        }
      } else if (type && Object.prototype.hasOwnProperty.call(totals, type)) {
        totals[type] += amount;
      }
    });

    return totals;
  }, [filteredTransactions, filters.payerId]);

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
