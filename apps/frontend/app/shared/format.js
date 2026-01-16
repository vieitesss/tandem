const currencyFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "EUR",
});

const monthFormatter = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
});

const shortDateFormatter = new Intl.DateTimeFormat("en-GB");
const dayFormatter = new Intl.DateTimeFormat("en-GB", { day: "numeric" });

export const formatCurrency = (value) =>
  currencyFormatter.format(Number(value || 0));

export const formatMonthLabel = (value) => {
  if (!value) {
    return "";
  }

  const [year, month] = String(value).split("-");
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, 1));

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return monthFormatter.format(date);
};

export const formatShortDate = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return shortDateFormatter.format(date);
};

export const formatDayOfMonth = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return dayFormatter.format(date);
};
