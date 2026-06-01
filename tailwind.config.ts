import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "#FFF1DA",
        navy: "#1B2F6B",
        red: "#C0281E",
        orange: "#E8821A",
      },
      fontFamily: {
        display: ['var(--font-anton)', 'sans-serif'],
        sans: ['var(--font-barlow)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
