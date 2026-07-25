import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eefbf3",
          100: "#d6f5e2",
          300: "#7fdfb0",
          500: "#1fb572",
          600: "#149259",
          700: "#0f7248",
          900: "#0a3d29",
        },
        surface: {
          light: "#f7f8fa",
          dark: "#0b0e12",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      backdropBlur: {
        xs: "2px",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
      },
    },
  },
  plugins: [],
};

export default config;
