/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        neuro: {
          bg: '#e0e5ec',
          text: '#4a5568',
          textLight: '#718096',
          accent: '#667eea',
          accentLight: '#764ba2',
          'checklist-bg': '#e8ecf4',
          'map-bg': '#dfe5ed',
          'ai-bg': '#e3e8f0',
          'emergency-bg': '#f0e5e8',
        },
      },
      boxShadow: {
        'neuro': '8px 8px 16px #a3b1c6, -8px -8px 16px #ffffff',
        'neuro-inset': 'inset 8px 8px 16px #a3b1c6, inset -8px -8px 16px #ffffff',
      },
    },
  },
  plugins: [],
}
