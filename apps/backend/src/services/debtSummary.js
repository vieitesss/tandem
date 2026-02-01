const { roundAmount, addAmount } = require("../lib/amounts");

const buildDebtSummary = async ({ db }) => {
  const { data: profiles, error: profilesError } = await db.listProfiles();

  if (profilesError) {
    return { error: profilesError };
  }

  const profileIds = profiles ? profiles.map((profile) => profile.id) : [];
  const baseEntries = profileIds.map((id) => [id, 0]);
  const expensesByProfile = new Map(baseEntries);
  const customSplitPaidByProfile = new Map(baseEntries);
  const owedTransactionsByProfile = new Map(baseEntries);
  const owedPaidByProfile = new Map(baseEntries);
  const customSplitShareByProfile = new Map(baseEntries);
  const liquidationsByProfile = new Map(baseEntries);
  const liquidationsReceivedByProfile = new Map(baseEntries);
  const owedTransactions = [];
  const liquidationTransactions = [];
  let totalCustomSplitExpenses = 0;

  if (!profiles || profiles.length === 0) {
    return {
      data: {
        from_date: null,
        profiles: [],
        expenses_by_profile: {},
        custom_split_paid_by_profile: {},
        custom_split_share_by_profile: {},
        total_custom_split_expenses: 0,
        owed_transactions_by_profile: {},
        owed_paid_by_profile: {},
        liquidations_by_profile: {},
        liquidations_received_by_profile: {},
        net_by_profile: {},
        balance: { from_profile_id: null, to_profile_id: null, amount: 0 },
        details: {
          custom_splits: [],
          owed_transactions: [],
          liquidations: [],
        },
      },
    };
  }

  const { data: transactions, error: transactionsError } =
    await db.listTransactions({});

  if (transactionsError) {
    return { error: transactionsError };
  }

  const customTransactions = new Map();
  const noteByTransactionId = new Map();
  const categoryByTransactionId = new Map();
  const dateByTransactionId = new Map();

  if (transactions && transactions.length > 0) {
    transactions.forEach((transaction) => {
      if (!transaction || transaction.type === "INCOME") {
        return;
      }

      const payerId = transaction.payer_id;
      const beneficiaryId = transaction.beneficiary_id;
      const amount = roundAmount(transaction.amount);

      if (transaction.note) {
        noteByTransactionId.set(transaction.id, transaction.note);
      }

      if (transaction.category) {
        categoryByTransactionId.set(transaction.id, transaction.category);
      }

      if (transaction.date) {
        dateByTransactionId.set(transaction.id, transaction.date);
      }

      if (transaction.type === "EXPENSE") {
        if (payerId) {
          addAmount(expensesByProfile, payerId, amount);
        }

        if (
          transaction.split_mode === "owed" &&
          payerId &&
          beneficiaryId &&
          payerId !== beneficiaryId
        ) {
          addAmount(owedTransactionsByProfile, beneficiaryId, amount);
          addAmount(owedPaidByProfile, payerId, amount);
          owedTransactions.push({
            id: transaction.id,
            payer_id: payerId,
            beneficiary_id: beneficiaryId,
            amount,
            date: transaction.date,
            note: transaction.note || null,
            category: transaction.category || null,
          });
        }

        if (transaction.split_mode === "custom" && payerId) {
          customTransactions.set(transaction.id, { payerId, amount });
          addAmount(customSplitPaidByProfile, payerId, amount);
          totalCustomSplitExpenses = roundAmount(
            totalCustomSplitExpenses + amount
          );
        }
      }

      if (transaction.type === "LIQUIDATION") {
        if (payerId) {
          addAmount(liquidationsByProfile, payerId, amount);
        }

        if (beneficiaryId) {
          addAmount(liquidationsReceivedByProfile, beneficiaryId, amount);
        }

        if (payerId && beneficiaryId) {
          liquidationTransactions.push({
            id: transaction.id,
            payer_id: payerId,
            beneficiary_id: beneficiaryId,
            amount,
            date: transaction.date,
            note: transaction.note || null,
          });
        }
      }
    });
  }

  const customSplitDetails = [];

  if (customTransactions.size > 0) {
    const customIds = Array.from(customTransactions.keys());
    const { data: splits, error: splitsError } =
      await db.listTransactionSplitsByTransactionIds(customIds);

    if (splitsError) {
      return { error: splitsError };
    }

    if (splits && splits.length > 0) {
      const splitsByTransaction = new Map();

      splits.forEach((split) => {
        const transaction = customTransactions.get(split.transaction_id);
        const userId = split.user_id;

        if (!transaction || !userId) {
          return;
        }

        const amount = roundAmount(split.amount);
        addAmount(customSplitShareByProfile, userId, amount);

        if (!splitsByTransaction.has(split.transaction_id)) {
          splitsByTransaction.set(split.transaction_id, []);
        }

        splitsByTransaction.get(split.transaction_id).push({
          user_id: userId,
          amount,
        });
      });

      Array.from(customTransactions.entries()).forEach(
        ([transactionId, data]) => {
          customSplitDetails.push({
            id: transactionId,
            payer_id: data.payerId,
            amount: data.amount,
            date: dateByTransactionId.get(transactionId) || null,
            note: noteByTransactionId.get(transactionId) || null,
            category: categoryByTransactionId.get(transactionId) || null,
            splits: splitsByTransaction.get(transactionId) || [],
          });
        }
      );
    } else {
      Array.from(customTransactions.entries()).forEach(
        ([transactionId, data]) => {
          customSplitDetails.push({
            id: transactionId,
            payer_id: data.payerId,
            amount: data.amount,
            date: dateByTransactionId.get(transactionId) || null,
            note: noteByTransactionId.get(transactionId) || null,
            category: categoryByTransactionId.get(transactionId) || null,
            splits: [],
          });
        }
      );
    }
  }

  const netByProfile = new Map(
    profileIds.map((profileId) => {
      const net = roundAmount(
        (customSplitPaidByProfile.get(profileId) || 0) +
          (owedPaidByProfile.get(profileId) || 0) +
          (liquidationsByProfile.get(profileId) || 0) -
          ((customSplitShareByProfile.get(profileId) || 0) +
            (owedTransactionsByProfile.get(profileId) || 0) +
            (liquidationsReceivedByProfile.get(profileId) || 0))
      );

      return [profileId, net];
    })
  );

  let balance = { from_profile_id: null, to_profile_id: null, amount: 0 };

  if (profiles.length >= 2) {
    const first = profiles[0];
    const second = profiles[1];
    const firstNet = roundAmount(netByProfile.get(first.id) || 0);
    const amount = roundAmount(Math.abs(firstNet));

    if (amount > 0) {
      if (firstNet > 0) {
        balance = {
          from_profile_id: second.id,
          to_profile_id: first.id,
          amount,
        };
      } else {
        balance = {
          from_profile_id: first.id,
          to_profile_id: second.id,
          amount,
        };
      }
    }
  }

  return {
    data: {
      from_date: null,
      profiles,
      expenses_by_profile: Object.fromEntries(expensesByProfile),
      custom_split_paid_by_profile: Object.fromEntries(customSplitPaidByProfile),
      custom_split_share_by_profile: Object.fromEntries(customSplitShareByProfile),
      total_custom_split_expenses: totalCustomSplitExpenses,
      owed_transactions_by_profile: Object.fromEntries(owedTransactionsByProfile),
      owed_paid_by_profile: Object.fromEntries(owedPaidByProfile),
      liquidations_by_profile: Object.fromEntries(liquidationsByProfile),
      liquidations_received_by_profile: Object.fromEntries(
        liquidationsReceivedByProfile
      ),
      net_by_profile: Object.fromEntries(netByProfile),
      balance,
      details: {
        custom_splits: customSplitDetails,
        owed_transactions: owedTransactions,
        liquidations: liquidationTransactions,
      },
    },
  };
};

module.exports = { buildDebtSummary };
