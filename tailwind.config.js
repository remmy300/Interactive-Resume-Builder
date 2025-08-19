/** @type {import('tailwindcss').Config} */
import colors from "tailwindcss/colors";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Override Tailwind to always use hex/RGB
        gray: colors.neutral, // fallback for gray shades
        blue: colors.blue,
        red: colors.red,
        green: colors.green,
        yellow: colors.yellow,
        // Add any custom colors as hex
        primary: "#165ef8",
        secondary: "#f3f4f6",
      },
    },
  },
  plugins: [],
  corePlugins: {
    // Disable modern color features
    textOpacity: true,
    backgroundOpacity: true,
  },
};
