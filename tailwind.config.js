
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: "#031f1f",
          gold: "#CFAE5B",
          ink: "#e8f2f2",
          card: "#0B2B2B",
          line: "#134444" 
        }
      },
      boxShadow: { card: "0 1px 0 rgba(255,255,255,0.05), 0 8px 24px rgba(0,0,0,0.35)" },
      borderRadius: { xl: "14px" }
    }
  },
  plugins: []
};
