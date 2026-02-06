const CATEGORY_ICON_KEY_TO_EMOJI = {
  cart: "🛒",
  home: "🏠",
  bolt: "💡",
  car: "🚗",
  health: "🩺",
  media: "🎬",
  bag: "🛍️",
  box: "📦",
  briefcase: "💼",
  gift: "🎁",
  paw: "🐾",
  book: "📚",
  shield: "🛡️",
  smile: "🙂",
  receipt: "🧾",
  tag: "🏷️",
};

export const resolveCategoryIcon = (icon) => {
  const value = String(icon || "").trim();
  if (!value) {
    return "";
  }

  return CATEGORY_ICON_KEY_TO_EMOJI[value.toLowerCase()] || value;
};
