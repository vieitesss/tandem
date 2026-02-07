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

const CATEGORY_ICON_KEYS = new Set(Object.keys(CATEGORY_ICON_KEY_TO_EMOJI));

const CATEGORY_EMOJI_TO_KEY = {
  "🛒": "cart",
  "🏠": "home",
  "💡": "bolt",
  "🍽️": "cart",
  "🚗": "car",
  "🩺": "health",
  "🎬": "media",
  "✈️": "car",
  "🛍️": "bag",
  "📦": "box",
  "💼": "briefcase",
  "🧑‍💻": "briefcase",
  "🎁": "gift",
  "🐾": "paw",
  "🎓": "book",
  "📚": "book",
  "🛡️": "shield",
  "🧹": "home",
  "🧸": "smile",
  "🧾": "receipt",
  "🧩": "tag",
  "💕": "gift",
  "🏞️": "car",
};

const CATEGORY_ICON_PATHS = {
  tag: "M3 10l7-7h7v7l-7 7-7-7zm9-3h.01",
  home: "M3 8.75L10 3l7 5.75V17H3V8.75zM7.5 17v-4h5v4",
  cart: "M3 4h2l1.4 8.2h8.3L16 6H6.2M8 16a1 1 0 100-2 1 1 0 000 2zm6 0a1 1 0 100-2 1 1 0 000 2z",
  bolt: "M11 2L5 10h4l-1 8 7-10h-4l1-6z",
  car: "M4 11l1.5-4h9L16 11v4h-1.5v-1.5h-9V15H4v-4zm2 .5h8",
  health: "M10 4v12M4 10h12",
  media: "M4 5h12v10H4zM8 8l4 2-4 2V8z",
  bag: "M5 7h10l-1 10H6L5 7zm3 0V5a2 2 0 114 0v2",
  box: "M4 7l6-3 6 3-6 3-6-3zm0 0v6l6 3 6-3V7",
  briefcase: "M3 7h14v9H3V7zm5-2h4v2H8V5z",
  gift: "M4 8h12v8H4V8zm0-2h12v2H4V6zm6 0v10M8 6s-2-3 0-3c1.5 0 2 3 2 3M12 6s2-3 0-3c-1.5 0-2 3-2 3",
  paw: "M7 8a1.2 1.2 0 110-2.4A1.2 1.2 0 017 8zm6 0a1.2 1.2 0 110-2.4A1.2 1.2 0 0113 8zM6 12.5c0-1.7 1.8-2.5 4-2.5s4 .8 4 2.5S12.2 15 10 15s-4-.8-4-2.5z",
  book: "M4 4h8a3 3 0 013 3v9H7a3 3 0 00-3 3V4zm0 0v12",
  shield: "M10 3l6 2v4c0 4.2-2.6 6.6-6 8-3.4-1.4-6-3.8-6-8V5l6-2z",
  smile: "M10 17a7 7 0 100-14 7 7 0 000 14zm-3-5c.6.8 1.7 1.2 3 1.2s2.4-.4 3-1.2M7.5 8.5h.01M12.5 8.5h.01",
  receipt: "M6 3h8v14l-2-1.2L10 17l-2-1.2L6 17V3zm2 4h4M8 9h4M8 11h3",
};

export const resolveCategoryIcon = (icon) => {
  const value = String(icon || "").trim();
  if (!value) {
    return "";
  }

  return CATEGORY_ICON_KEY_TO_EMOJI[value.toLowerCase()] || value;
};

export const resolveCategoryIconKey = (icon, label) => {
  const iconValue = String(icon || "").trim().toLowerCase();
  const labelValue = String(label || "").trim().toLowerCase();

  if (CATEGORY_ICON_KEYS.has(iconValue)) {
    return iconValue;
  }

  if (CATEGORY_EMOJI_TO_KEY[iconValue]) {
    return CATEGORY_EMOJI_TO_KEY[iconValue];
  }

  if (labelValue.includes("rent") || labelValue.includes("home")) return "home";
  if (
    labelValue.includes("groc") ||
    labelValue.includes("food") ||
    labelValue.includes("restaurant")
  ) {
    return "cart";
  }
  if (labelValue.includes("util") || labelValue.includes("bill")) return "bolt";
  if (
    labelValue.includes("transport") ||
    labelValue.includes("travel") ||
    labelValue.includes("trip")
  ) {
    return "car";
  }
  if (labelValue.includes("health") || labelValue.includes("medical")) return "health";
  if (labelValue.includes("entertain")) return "media";
  if (labelValue.includes("shop")) return "bag";
  if (labelValue.includes("subscr")) return "box";
  if (labelValue.includes("salary") || labelValue.includes("freelance")) {
    return "briefcase";
  }
  if (labelValue.includes("gift") || labelValue.includes("date night")) return "gift";
  if (labelValue.includes("pet")) return "paw";
  if (labelValue.includes("education")) return "book";
  if (labelValue.includes("insurance")) return "shield";
  if (labelValue.includes("kids")) return "smile";
  if (labelValue.includes("tax")) return "receipt";

  return "tag";
};

export const getCategoryIconPath = (icon, label) => {
  const key = resolveCategoryIconKey(icon, label);
  return CATEGORY_ICON_PATHS[key] || CATEGORY_ICON_PATHS.tag;
};
