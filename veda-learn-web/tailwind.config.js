/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        veda: {
          bg:      '#07090f',
          surface: '#0d1117',
          panel:   '#161b27',
          border:  'rgba(255,255,255,0.07)',
          indigo:  '#6366f1',
          violet:  '#8b5cf6',
          amber:   '#fbbf24',
          green:   '#10b981',
          red:     '#ef4444',
        }
      },
      fontFamily: {
        sans: ['Syne', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    }
  },
  plugins: []
}
