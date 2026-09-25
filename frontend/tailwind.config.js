/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./lib/**/*.{js,jsx}"
  ],
  theme: {
    borderRadius: {
      DEFAULT: "6px",
      none: "0",
      sm: "4px",
      md: "6px",
      lg: "6px",
      full: "9999px"
    },
    extend: {
      colors: {
        primary: "#0B3D6E",
        primaryDark: "#072A4D",
        accent: "#D9730D",
        bg: "#F5F7FA",
        surface: "#FFFFFF",
        border: "#D7DEE5",
        text: "#1A2733",
        textMuted: "#5B6B7A",
        success: "#1E7B45",
        warning: "#B9770E",
        error: "#B3261E"
      },
      fontFamily: {
        sans: ["var(--font-noto-sans)", "sans-serif"],
        mono: ["var(--font-ibm-plex-mono)", "monospace"]
      },
      boxShadow: {
        none: "none"
      }
    }
  },
  plugins: []
};
