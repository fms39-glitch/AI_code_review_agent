import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#070b12",
          900: "#0c1220",
          800: "#141c2c",
          700: "#1c2740",
        },
        teal: {
          300: "#5eead4",
          400: "#2dd4bf",
          500: "#14b8a6",
        },
        sand: {
          100: "#e8eef7",
          300: "#a8b3c7",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
