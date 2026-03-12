/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2c3e28',
        secondary: '#d4c89a',
        accent: '#cc4a14',
        background: '#0f0f0f',
        surface: '#1a1a1a',
        'surface-light': '#252525',
      },
    },
  },
  plugins: [],
}
