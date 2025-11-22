/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "rgb(255, 255, 255)",
        foreground: "rgb(37, 37, 37)",
        card: "rgb(255, 255, 255)",
        "card-foreground": "rgb(37, 37, 37)",
        primary: "rgb(52, 52, 52)",
        "primary-foreground": "rgb(251, 251, 251)",
        secondary: "rgb(247, 247, 247)",
        "secondary-foreground": "rgb(52, 52, 52)",
        muted: "rgb(247, 247, 247)",
        "muted-foreground": "rgb(142, 142, 142)",
        accent: "rgb(247, 247, 247)",
        "accent-foreground": "rgb(52, 52, 52)",
        destructive: "rgb(239, 68, 68)",
        border: "rgb(235, 235, 235)",
        input: "rgb(235, 235, 235)",
        ring: "rgb(181, 181, 181)"
      }
    }
  },
  plugins: []
}
