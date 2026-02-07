const emojiOptions = [
  "🛒",
  "🏠",
  "💡",
  "🍽️",
  "🚗",
  "🩺",
  "🎬",
  "✈️",
  "🛍️",
  "📦",
  "💼",
  "🧑‍💻",
  "🎁",
  "🐾",
  "🎓",
  "🛡️",
  "🧹",
  "🧸",
  "🧾",
  "🧩",
  "☕",
  "🎵",
  "📚",
  "💳",
  "🧠",
  "🏖️",
  "🎉",
  "🍷",
  "🛠️",
  "📱",
  "🚲",
  "🧪",
  "🪴",
  "🎨",
  "🍜",
  "💊",
  "🏋️",
  "💇",
  "🧴",
];

export default function EmojiPicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-10 gap-2 rounded-2xl border border-obsidian-600/80 bg-obsidian-900 p-4">
      {emojiOptions.map((emoji) => {
        const isActive = emoji === value;
        return (
          <button
            key={emoji}
            type="button"
            className={`flex h-9 w-9 items-center justify-center rounded-xl text-lg transition-all duration-200 ${
              isActive
                ? "bg-cream-500 text-white shadow-glow-md"
                : "bg-white text-cream-100 hover:bg-obsidian-700"
            }`}
            onClick={() => onChange(emoji)}
            aria-label={`Select ${emoji}`}
          >
            {emoji}
          </button>
        );
      })}
    </div>
  );
}
