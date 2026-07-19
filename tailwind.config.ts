import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#0F6E56",
        danger: "#A32D2D",
        warning: "#854F0B",
      },
    },
  },
  plugins: [],
};

export default config;
