/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#0d1117',
          panel: '#161b22',
          card: '#1c2128',
          hover: '#21262d',
          input: '#0d1117',
        },
        border: {
          DEFAULT: '#30363d',
          subtle: '#21262d',
          strong: '#3d444d',
        },
        text: {
          primary: '#e6edf3',
          secondary: '#8b949e',
          muted: '#4d5566',
          link: '#58a6ff',
        },
        green: {
          DEFAULT: '#3fb950',
          dim: '#1a4427',
          bright: '#56d364',
        },
        yellow: {
          DEFAULT: '#d29922',
          dim: '#3a2e00',
          bright: '#e3b341',
        },
        red: {
          DEFAULT: '#f85149',
          dim: '#3d1a19',
          bright: '#ff7b72',
        },
        blue: {
          DEFAULT: '#58a6ff',
          dim: '#1a2f4d',
          bright: '#79c0ff',
        },
        purple: {
          DEFAULT: '#bc8cff',
          dim: '#2d1f5e',
        },
        cyan: {
          DEFAULT: '#39d3c3',
          dim: '#0e3030',
        },
        orange: {
          DEFAULT: '#f0883e',
          dim: '#3d1f00',
        },
        // Legacy compat
        terminal: {
          bg: '#0d1117',
          panel: '#161b22',
          border: '#30363d',
          header: '#1c2128',
          text: '#e6edf3',
          dim: '#4d5566',
          green: '#3fb950',
          yellow: '#d29922',
          red: '#f85149',
          blue: '#58a6ff',
          cyan: '#39d3c3',
          orange: '#f0883e',
        },
        background: '#0d1117',
        surface: '#161b22',
        'surface-light': '#1c2128',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Consolas', 'ui-monospace', 'monospace'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      borderRadius: {
        card: '8px',
        badge: '4px',
      },
      boxShadow: {
        panel: '0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px rgba(48,54,61,0.5)',
        card: '0 2px 8px rgba(0,0,0,0.3)',
        glow: {
          green: '0 0 8px rgba(63,185,80,0.3)',
          blue: '0 0 8px rgba(88,166,255,0.3)',
          red: '0 0 8px rgba(248,81,73,0.3)',
        },
      },
    },
  },
  plugins: [],
}
