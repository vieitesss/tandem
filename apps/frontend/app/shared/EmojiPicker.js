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
    <div className="grid grid-cols-10 gap-2 rounded-2xl border border-cream-500/15 bg-obsidian-900/60 p-4">
      {emojiOptions.map((emoji) => {
        const isActive = emoji === value;
        return (
          <button
            key={emoji}
            type="button"
            className={`flex h-9 w-9 items-center justify-center rounded-xl text-lg transition-all duration-200 ${
              isActive
                ? "bg-cream-500 text-obsidian-950 shadow-glow-md"
                : "bg-obsidian-800/60 text-cream-100 hover:bg-obsidian-700/60"
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
