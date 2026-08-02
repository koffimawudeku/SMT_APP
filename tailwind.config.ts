import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Palette vive inspirée du design de référence.
        primary: "#2E90FA", // bleu vif
        accent: "#7C5CFC", // violet
        danger: "#E5484D",
        warning: "#F5A524",
        success: "#17B26A",
        // Tokens sémantiques pilotés par les variables CSS (thème clair/sombre).
        canvas: "var(--canvas)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
      },
      boxShadow: {
        card: "0 1px 3px rgba(16, 24, 40, 0.06), 0 1px 2px rgba(16, 24, 40, 0.04)",
        soft: "0 8px 24px rgba(16, 24, 40, 0.08)",
      },
      borderRadius: {
        xl: "0.9rem",
        "2xl": "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
