const { roundAmount } = require("../lib/amounts");

const buildTimeline = async ({ db }) => {
  // Fetch all transactions ordered by date
  const { data: transactions, error: transactionsError } =
    await db.listTimelineTransactions();

  if (transactionsError) {
    return { error: transactionsError };
  }

  if (!transactions || transactions.length === 0) {
    return {
      data: {
        summary: {
          first_transaction_date: null,
          total_transactions: 0,
          total_money_managed: 0,
          months_together: 0,
        },
        insights: {},
        monthly_data: [],
        milestones: [],
      },
    };
  }

  // Calculate summary stats
  const firstTransactionDate = transactions[0].date;
  const lastTransactionDate = transactions[transactions.length - 1].date;
  const totalTransactions = transactions.length;
  const totalMoneyManaged = transactions.reduce(
    (sum, t) => (t.type === "EXPENSE" ? sum + Number(t.amount) : sum),
    0
  );

  const firstDate = new Date(firstTransactionDate);
  const lastDate = new Date(lastTransactionDate);
  const monthsDiff =
    (lastDate.getFullYear() - firstDate.getFullYear()) * 12 +
    (lastDate.getMonth() - firstDate.getMonth()) +
    1;

  // Group transactions by month
  const monthlyMap = new Map();
  transactions.forEach((t) => {
    const monthKey = t.date.slice(0, 7); // YYYY-MM
    if (!monthlyMap.has(monthKey)) {
      monthlyMap.set(monthKey, {
        month: monthKey,
        total_spent: 0,
        transaction_count: 0,
        transactions: [],
      });
    }
    const monthData = monthlyMap.get(monthKey);
    if (t.type === "EXPENSE") {
      monthData.total_spent = roundAmount(
        monthData.total_spent + Number(t.amount)
      );
    }
    monthData.transaction_count++;
    monthData.transactions.push(t);
  });

  const monthlyData = Array.from(monthlyMap.values());

  // Calculate insights
  const categoryCount = {};
  transactions.forEach((t) => {
    if (t.category) {
      categoryCount[t.category] = (categoryCount[t.category] || 0) + 1;
    }
  });

  const mostCommonCategory =
    Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  const busiestMonth = monthlyData.reduce(
    (max, month) => (month.total_spent > max.total_spent ? month : max),
    monthlyData[0]
  );

  const averageMonthlySpending =
    monthlyData.length > 0
      ? roundAmount(
          monthlyData.reduce((sum, m) => sum + m.total_spent, 0) /
            monthlyData.length
        )
      : 0;

  const insights = {
    most_common_category: mostCommonCategory,
    busiest_month: busiestMonth?.month || null,
    busiest_month_amount: busiestMonth?.total_spent || 0,
    average_monthly_spending: averageMonthlySpending,
  };

  // Calculate milestones
  const milestones = [];

  // First transaction
  milestones.push({
    type: "first_transaction",
    date: firstTransactionDate,
    title: "Your financial journey began",
    description: "First transaction recorded",
    icon: "💑",
  });

  // Every 100th transaction
  for (let i = 100; i <= totalTransactions; i += 100) {
    const transaction = transactions[i - 1];
    milestones.push({
      type: "transaction_milestone",
      date: transaction.date,
      title: `${i} transactions together`,
      description: `Reached ${i} shared transactions`,
      icon: "🎯",
    });
  }

  // Largest expense
  const largestExpense = transactions
    .filter((t) => t.type === "EXPENSE")
    .reduce(
      (max, t) => (t.amount > max.amount ? t : max),
      { amount: 0, date: null }
    );

  if (largestExpense.date) {
    milestones.push({
      type: "largest_expense",
      date: largestExpense.date,
      title: "Largest expense",
      description: `€${Number(largestExpense.amount).toFixed(2)}`,
      icon: "💰",
    });
  }

  // Sort milestones by date
  milestones.sort((a, b) => new Date(a.date) - new Date(b.date));

  return {
    data: {
      summary: {
        first_transaction_date: firstTransactionDate,
        total_transactions: totalTransactions,
        total_money_managed: roundAmount(totalMoneyManaged),
        months_together: monthsDiff,
      },
      insights,
      monthly_data: monthlyData,
      milestones,
    },
  };
};

module.exports = { buildTimeline };
