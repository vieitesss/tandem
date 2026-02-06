export const getMonthKey = (dateString) => {
  if (!dateString) {
    return "unknown";
  }

  return String(dateString).slice(0, 7);
};

export const sortByDateDesc = (left, right, dateField = "date") => {
  const leftDate = left?.[dateField] ? new Date(left[dateField]).getTime() : 0;
  const rightDate = right?.[dateField] ? new Date(right[dateField]).getTime() : 0;
  return rightDate - leftDate;
};

export const groupByMonth = (items, getDateValue) => {
  const groups = new Map();

  items.forEach((item) => {
    const dateValue =
      typeof getDateValue === "function" ? getDateValue(item) : item?.date;
    const monthKey = getMonthKey(dateValue);
    if (!groups.has(monthKey)) {
      groups.set(monthKey, []);
    }
    groups.get(monthKey).push(item);
  });

  return Array.from(groups.keys())
    .sort((a, b) => b.localeCompare(a))
    .map((month) => ({ month, items: groups.get(month) }));
};
