/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Bloomberg terminal palette
        terminal: {
          bg: '#050509',
          panel: '#08090f',
          border: '#1a2035',
          header: '#0c1428',
          text: '#c8d8f0',
          dim: '#4a5568',
          green: '#00d97e',
          yellow: '#ffc107',
          red: '#ff4560',
          blue: '#4dabf7',
          cyan: '#22d3ee',
          orange: '#fb923c',
        },
        // Legacy compat
        primary: '#0c1428',
        secondary: '#4dabf7',
        accent: '#00d97e',
        background: '#050509',
        surface: '#08090f',
        'surface-light': '#0f1628',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Consolas', 'ui-monospace', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'blink': 'blink 1s step-end infinite',
        'ticker': 'ticker 30s linear infinite',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
      },
    },
  },
  plugins: [],
}
