import type { Config } from "tailwindcss";
import colors from "tailwindcss/colors";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    colors: {
      primary: "var(--primary)",
      "primary-accent": "var(--primary-accent)",
      background: "var(--background)",
      black: "var(--black)",
      white: "var(--white)",
      pink: "var(--pink)",
      green: "var(--green)",
      "green-medium": "var(--green-medium)",
      orange: "var(--orange)",
      purple: "var(--purple)",
      red: "var(--red)",
      transparent: colors.transparent,
      accent: {
        100: "hsl(0, 0%, 97%)",
        200: "hsl(0, 0%, 92%)",
        300: "hsl(0, 0%, 87%)",
        400: "hsl(190, 11%, 39%)",
      },
      button: {
        primary: "var(--background)",
        secondary: "var(--btn-secondary)",
      },
      tabs: {
        background: "var(--tabs-background)",
        accent: "var(--tabs-accent)",
      },
      outline: "var(--outline)",
      gray: colors.zinc,
    },
    fontFamily: {
      body: ["var(--font-body)"],
      feature: ["var(--font-feature)"],
      ui: ["var(--font-ui)"],
    },
    extend: {
      borderRadius: {
        default: "125rem",
      },
      animation: {
        "spin-slow": "spin 3s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
