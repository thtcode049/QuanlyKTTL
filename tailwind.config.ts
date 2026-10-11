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
        brand: {
          primary: "#00B18A",
          "primary-hover": "#009675",
          "primary-light": "#E6F7F3",
          secondary: "#E67E22",
          "secondary-hover": "#D35400",
          "secondary-warm": "#DE8D1E",
          olive: "#738136",
          dark: "#161616",
          slate: "#1E293B",
          bg: "#F8FAF9",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "Plus Jakarta Sans", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "12px",
      },
      boxShadow: {
        soft: "0 2px 10px -2px rgba(0, 0, 0, 0.05), 0 1px 3px -1px rgba(0, 0, 0, 0.03)",
        card: "0 4px 20px -2px rgba(0, 177, 138, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04)",
      },
    },
  },
  plugins: [],
};
export default config;
