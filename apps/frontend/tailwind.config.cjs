/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          950: "#FCFDFE",
          900: "#F7F9FB",
          800: "#FFFFFF",
          700: "#EEF2F6",
          600: "#D6DEE8",
        },
        ink: {
          50: "#0F172A",
          100: "#1E293B",
          200: "#334155",
          300: "#475467",
          400: "#667085",
        },
        accent: {
          500: "#2E4E73",
          600: "#243F61",
          700: "#1C324E",
        },
        // Neutral flat surface palette
        obsidian: {
          950: "#FCFDFE",
          900: "#F7F9FB",
          800: "#FFFFFF",
          700: "#EEF2F6",
          600: "#D6DEE8",
        },
        // Neutral ink and accent
        cream: {
          50: "#0F172A",
          100: "#1E293B",
          200: "#334155",
          300: "#475467",
          400: "#667085",
          500: "#2E4E73",
          600: "#243F61",
          700: "#1C324E",
        },
        // Positive financial states (income)
        sage: {
          50: "#0B3D2E",
          100: "#14553E",
          200: "#1D6D4E",
          300: "#258460",
          400: "#81C784",
          500: "#9BD3A0",
          600: "#B8E0BD",
        },
        // Expense and danger states
        coral: {
          50: "#6A2F2A",
          100: "#7A3932",
          200: "#8C443B",
          300: "#A04E43",
          400: "#E57373",
          500: "#ED8E8E",
          600: "#F3AAAA",
        },
      },
      fontFamily: {
        display: ["var(--font-inter)", "system-ui", "sans-serif"],
        body: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      letterSpacing: {
        luxury: "0.05em",
        wide: "0.1em",
        wider: "0.15em",
      },
      boxShadow: {
        "glow-sm": "0 1px 2px rgba(15, 23, 42, 0.06), 0 4px 10px rgba(46, 78, 115, 0.08)",
        "glow-md": "0 2px 6px rgba(15, 23, 42, 0.08), 0 10px 24px rgba(46, 78, 115, 0.1)",
        "glow-lg": "0 8px 22px rgba(15, 23, 42, 0.12), 0 20px 36px rgba(46, 78, 115, 0.14)",
        "elevated": "0 6px 18px rgba(15, 23, 42, 0.08)",
        "card": "0 2px 10px rgba(15, 23, 42, 0.06)",
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
