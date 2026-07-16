const { roundAmount } = require("../lib/amounts");

const monthKey = (date) => String(date).slice(0, 7);

const nextMonth = (month) => {
  const [year, value] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, value, 1));
  return date.toISOString().slice(0, 7);
};

const summarizeTimeline = (transactions, currentMonth) => {
  if (!transactions.length) {
    return {
      latest_month: null,
      monthly_data: [],
      category_usage: [],
    };
  }

  const latestMonth = monthKey(transactions[transactions.length - 1].date);
  const firstMonth = monthKey(transactions[0].date);
  const startMonth = currentMonth < firstMonth ? currentMonth : firstMonth;
  const finalMonth = currentMonth > latestMonth ? currentMonth : latestMonth;
  const monthlyMap = new Map();

  for (let month = startMonth; month <= finalMonth; month = nextMonth(month)) {
    monthlyMap.set(month, {
      month,
      total_spent: 0,
      income_total: 0,
      transaction_count: 0,
      categories: [],
      largest_shared_expense: null,
    });
  }

  const categoriesByMonth = new Map();
  const categoryUsage = new Map();

  transactions.forEach((transaction) => {
    const month = monthKey(transaction.date);
    const summary = monthlyMap.get(month);

    if (!summary) {
      return;
    }

    if (transaction.type === "INCOME") {
      summary.income_total = roundAmount(summary.income_total + Number(transaction.amount));
      return;
    }

    if (transaction.type !== "EXPENSE") {
      return;
    }

    const amount = Number(transaction.amount);
    summary.total_spent = roundAmount(summary.total_spent + amount);
    summary.transaction_count += 1;

    if (transaction.category) {
      const categoryKey = `${month}:${transaction.category}`;
      const category = categoriesByMonth.get(categoryKey) || {
        category: transaction.category,
        amount: 0,
        transaction_count: 0,
      };
      category.amount = roundAmount(category.amount + amount);
      category.transaction_count += 1;
      categoriesByMonth.set(categoryKey, category);

      const usage = categoryUsage.get(transaction.category) || {
        category: transaction.category,
        transaction_count: 0,
        last_used_date: transaction.date,
      };
      usage.transaction_count += 1;
      if (transaction.date > usage.last_used_date) {
        usage.last_used_date = transaction.date;
      }
      categoryUsage.set(transaction.category, usage);
    }

    if (
      transaction.split_mode === "custom" &&
      (!summary.largest_shared_expense ||
        amount > Number(summary.largest_shared_expense.amount))
    ) {
      summary.largest_shared_expense = {
        id: transaction.id,
        amount,
        category: transaction.category,
        note: transaction.note,
        date: transaction.date,
      };
    }
  });

  const monthlyData = Array.from(monthlyMap.values()).map((summary) => {
    const categories = Array.from(categoriesByMonth.entries())
      .filter(([key]) => key.startsWith(`${summary.month}:`))
      .map(([, category]) => ({
        ...category,
        share: summary.total_spent
          ? Math.round((category.amount / summary.total_spent) * 100)
          : 0,
      }))
      .sort((a, b) => b.amount - a.amount || a.category.localeCompare(b.category));

    return { ...summary, categories };
  });

  return {
    latest_month: latestMonth,
    monthly_data: monthlyData,
    category_usage: Array.from(categoryUsage.values()),
  };
};

const buildTimeline = async ({ db, now = new Date() }) => {
  const { data: transactions, error } = await db.listTimelineTransactions();

  if (error) {
    return { error };
  }

  return {
    data: summarizeTimeline(
      transactions || [],
      now.toISOString().slice(0, 7)
    ),
  };
};

module.exports = { buildTimeline, summarizeTimeline };
