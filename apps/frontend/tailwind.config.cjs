/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Semantic light-first base palette
        obsidian: {
          950: "#FCFCFD",
          900: "#F8FAFC",
          800: "#FFFFFF",
          700: "#EEF2F6",
          600: "#D9DFEA",
        },
        // Editorial ink + accent range
        cream: {
          50: "#0F172A",
          100: "#1E293B",
          200: "#334155",
          300: "#475467",
          400: "#64748B",
          500: "#2563EB",
          600: "#1D4ED8",
          700: "#1E40AF",
        },
        // Positive financial states
        sage: {
          50: "#054F31",
          100: "#05603A",
          200: "#027A48",
          300: "#039855",
          400: "#12B76A",
          500: "#32D583",
          600: "#6CE9A6",
        },
        // Expense and danger states
        coral: {
          50: "#7A271A",
          100: "#912018",
          200: "#B42318",
          300: "#D92D20",
          400: "#F04438",
          500: "#F97066",
          600: "#FDA29B",
        },
      },
      fontFamily: {
        display: ["var(--font-clash)", "system-ui", "sans-serif"],
        body: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      letterSpacing: {
        luxury: "0.05em",
        wide: "0.1em",
        wider: "0.15em",
      },
      boxShadow: {
        "glow-sm": "0 2px 10px rgba(37, 99, 235, 0.15)",
        "glow-md": "0 6px 18px rgba(37, 99, 235, 0.2)",
        "glow-lg": "0 12px 28px rgba(37, 99, 235, 0.24)",
        "elevated": "0 24px 48px rgba(16, 24, 40, 0.14)",
        "card": "0 8px 24px rgba(16, 24, 40, 0.08)",
      },
      animation: {
        "fade-in": "fadeIn 0.6s ease-out",
        "slide-up": "slideUp 0.5s ease-out",
        "scale-in": "scaleIn 0.4s ease-out",
        "glow": "glow 2s ease-in-out infinite alternate",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        scaleIn: {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        glow: {
          "0%": { boxShadow: "0 0 10px rgba(184, 153, 104, 0.1)" },
          "100%": { boxShadow: "0 0 20px rgba(184, 153, 104, 0.3)" },
        },
      },
    },
  },
  plugins: [],
};
