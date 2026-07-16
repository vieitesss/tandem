const { roundAmount } = require("../lib/amounts");

const contributionOf = (transaction, splits = []) => {
  const deltas = new Map();
  const add = (profileId, amount) => {
    if (!profileId && profileId !== 0) {
      return;
    }

    deltas.set(
      profileId,
      roundAmount((deltas.get(profileId) || 0) + Number(amount || 0))
    );
  };

  if (!transaction) {
    return [];
  }

  const amount = roundAmount(transaction.amount);

  if (transaction.type === "EXPENSE") {
    if (transaction.split_mode === "custom") {
      add(transaction.payer_id, amount);
      (Array.isArray(splits) ? splits : []).forEach((split) => {
        add(split?.user_id, -roundAmount(split?.amount));
      });
    } else if (
      transaction.split_mode === "owed" &&
      transaction.payer_id &&
      transaction.beneficiary_id &&
      transaction.payer_id !== transaction.beneficiary_id
    ) {
      add(transaction.payer_id, amount);
      add(transaction.beneficiary_id, -amount);
    }
  }

  if (
    transaction.type === "LIQUIDATION" &&
    transaction.payer_id &&
    transaction.beneficiary_id &&
    transaction.payer_id !== transaction.beneficiary_id
  ) {
    add(transaction.payer_id, amount);
    add(transaction.beneficiary_id, -amount);
  }

  return Array.from(deltas, ([profile_id, delta]) => ({ profile_id, delta }));
};

module.exports = { contributionOf };
