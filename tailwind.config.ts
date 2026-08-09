import type { Config } from 'tailwindcss'

// Design tokens (colors, font, easing) live in src/index.css's `@theme` block
// (Tailwind v4-idiomatic). This file just scopes what gets scanned for classes.
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  plugins: [],
} satisfies Config