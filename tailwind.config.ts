import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      boxShadow:{
        xs: "1px 1px 0 0 #000",
        md: "3px 3px 0 0 #000",
        "3xl": "10px 10px 0 0 #000",
      }
    },
  },
  plugins: [],
} satisfies Config;
