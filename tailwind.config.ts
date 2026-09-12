import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cinema: {
          950: "#06080D",
          900: "#0D111A",
          850: "#121724",
          800: "#182030",
          700: "#222D42",
          600: "#32405C",
          500: "#4A5D82",
          400: "#798EB5",
          300: "#A9B8D4",
          200: "#D3DCEB",
          100: "#EDF2F9",
        },
        gold: {
          50: "#FFFBEB",
          100: "#FEF3C7",
          200: "#FDE68A",
          300: "#FCD34D",
          400: "#FBBF24",
          500: "#F59E0B",
          600: "#D97706",
          700: "#B45309",
          800: "#92400E",
          900: "#78350F",
        },
      },
      boxShadow: {
        screen: "0 0 50px -5px rgba(245, 158, 11, 0.35)",
        "screen-lg": "0 0 80px -10px rgba(56, 189, 248, 0.4)",
        glow: "0 0 20px -3px rgba(245, 158, 11, 0.4)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};
export default config;
