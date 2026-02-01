const { roundAmount } = require("../lib/amounts");

const buildPersonMonthlySummary = async ({ db }) => {
  const { data: profiles, error: profilesError } = await db.listProfiles();

  if (profilesError) {
    return { error: profilesError };
  }

  const { data: transactions, error: transactionsError } =
    await db.listTimelineTransactions();

  if (transactionsError) {
    return { error: transactionsError };
  }

  if (!transactions || transactions.length === 0) {
    return {
      data: {
        profiles: profiles || [],
        monthly_summary: [],
      },
    };
  }

  // Group transactions by month and profile
  const monthlyMap = new Map();

  transactions.forEach((t) => {
    const monthKey = t.date.slice(0, 7); // YYYY-MM

    if (!monthlyMap.has(monthKey)) {
      monthlyMap.set(monthKey, new Map());
    }

    const profileMap = monthlyMap.get(monthKey);

    // Initialize profile entries if not exists
    if (t.payer_id && !profileMap.has(t.payer_id)) {
      profileMap.set(t.payer_id, {
        profile_id: t.payer_id,
        expenses_total: 0,
        income_total: 0,
        liquidations_received_total: 0,
        liquidations_paid_total: 0,
      });
    }

    if (t.beneficiary_id && !profileMap.has(t.beneficiary_id)) {
      profileMap.set(t.beneficiary_id, {
        profile_id: t.beneficiary_id,
        expenses_total: 0,
        income_total: 0,
        liquidations_received_total: 0,
        liquidations_paid_total: 0,
      });
    }

    // Aggregate based on transaction type
    if (t.type === "EXPENSE" && t.payer_id) {
      const profileData = profileMap.get(t.payer_id);
      profileData.expenses_total = roundAmount(
        profileData.expenses_total + Number(t.amount)
      );
    }

    if (t.type === "INCOME" && t.payer_id) {
      const profileData = profileMap.get(t.payer_id);
      profileData.income_total = roundAmount(
        profileData.income_total + Number(t.amount)
      );
    }

    if (t.type === "LIQUIDATION") {
      // Track liquidations received by beneficiary
      if (t.beneficiary_id) {
        const profileData = profileMap.get(t.beneficiary_id);
        profileData.liquidations_received_total = roundAmount(
          profileData.liquidations_received_total + Number(t.amount)
        );
      }
      // Track liquidations paid by payer
      if (t.payer_id) {
        const profileData = profileMap.get(t.payer_id);
        profileData.liquidations_paid_total = roundAmount(
          profileData.liquidations_paid_total + Number(t.amount)
        );
      }
    }
  });

  // Convert to sorted array (newest month first)
  const monthlySummary = Array.from(monthlyMap.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([month, profileMap]) => {
      const profiles = Array.from(profileMap.values()).map((p) => {
        const total_spent = roundAmount(p.expenses_total + p.liquidations_paid_total);
        const total_income = roundAmount(p.income_total + p.liquidations_received_total);
        const net_total = roundAmount(total_income - total_spent);

        return {
          profile_id: p.profile_id,
          expenses_total: p.expenses_total,
          liquidations_paid_total: p.liquidations_paid_total,
          total_spent,
          income_total: p.income_total,
          liquidations_received_total: p.liquidations_received_total,
          total_income,
          net_total,
        };
      });

      return {
        month,
        profiles,
      };
    });

  return {
    data: {
      profiles: profiles || [],
      monthly_summary: monthlySummary,
    },
  };
};

module.exports = { buildPersonMonthlySummary };
