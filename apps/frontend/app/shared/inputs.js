export const normalizeNumberInput = (value) => {
  if (!value) {
    return "";
  }

  const sanitized = value.replace(/[^0-9.]/g, "");
  const [whole, ...decimals] = sanitized.split(".");

  return decimals.length > 0 ? `${whole}.${decimals.join("")}` : whole;
};
