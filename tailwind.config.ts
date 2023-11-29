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
      primary: "hsl(var(--primary) / <alpha-value>)",
      "primary-accent": "hsl(var(--primary-accent) / <alpha-value>)",
      background: "hsl(var(--background) / <alpha-value>)",
      black: "hsl(var(--black) / <alpha-value>)",
      white: "hsl(var(--white) / <alpha-value>)",
      pink: "hsl(var(--pink) / <alpha-value>)",
      green: "hsl(var(--green) / <alpha-value>)",
      "green-medium": "hsl(var(--green-medium) / <alpha-value>)",
      orange: "hsl(var(--orange) / <alpha-value>)",
      purple: "hsl(var(--purple) / <alpha-value>)",
      red: "hsl(var(--red) / <alpha-value>)",
      transparent: colors.transparent,
      accent: {
        100: "hsl(0, 0%, 97%)",
        200: "hsl(0, 0%, 92%)",
        300: "hsl(0, 0%, 87%)",
        400: "hsl(190, 11%, 39%)",
      },
      button: {
        primary: "hsl(var(--background) / <alpha-value>)",
        secondary: "hsl(var(--btn-secondary) / <alpha-value>)",
      },
      tabs: {
        background: "hsl(var(--tabs-background) / <alpha-value>)",
        accent: "hsl(var(--tabs-accent) / <alpha-value>)",
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
