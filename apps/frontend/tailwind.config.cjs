/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Premium dark palette with warm undertones - lighter version
        obsidian: {
          950: "#1A1A1E",
          900: "#202026",
          800: "#28282F",
          700: "#32323A",
          600: "#3E3E48",
        },
        // Lighter warm accent (soft cream/beige)
        cream: {
          50: "#FFFCF7",
          100: "#FDF8F0",
          200: "#F8F0E3",
          300: "#F0E5D1",
          400: "#E5D5B8",
          500: "#D4C19D",
          600: "#BFA982",
          700: "#9E8A6A",
        },
        // Sage green for positive financial states
        sage: {
          50: "#F4F6F4",
          100: "#E8EDE8",
          200: "#D4DDD4",
          300: "#A8BDA8",
          400: "#8BA888",
          500: "#6B8E6B",
          600: "#577357",
        },
        // Softer coral/salmon for expenses
        coral: {
          50: "#FDF5F4",
          100: "#FBEAE7",
          200: "#F6D5CF",
          300: "#EDB5AA",
          400: "#E19181",
          500: "#D47061",
          600: "#B85A4C",
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
        "glow-sm": "0 0 10px rgba(229, 213, 184, 0.1)",
        "glow-md": "0 0 20px rgba(229, 213, 184, 0.15)",
        "glow-lg": "0 0 30px rgba(229, 213, 184, 0.2)",
        "elevated": "0 20px 40px rgba(0, 0, 0, 0.4), 0 0 1px rgba(229, 213, 184, 0.1)",
        "card": "0 8px 24px rgba(0, 0, 0, 0.3), 0 0 1px rgba(229, 213, 184, 0.08)",
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
