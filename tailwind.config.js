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
          light: '#ffffff',
          dark: '#a3b1c6',
          accent: '#667eea',
          accentLight: '#764ba2',
          text: '#4a5568',
          textLight: '#718096',
          emergency: '#f56565',
          success: '#48bb78',
          // Page-specific backgrounds
          checklist: {
            bg: '#e8ecf1',
            card: '#f0f3f7',
            text: '#2d3748',
            textLight: '#4a5568',
          },
          map: {
            bg: '#d8dde6',
            card: '#e2e7ef',
            text: '#1a202c',
            textLight: '#2d3748',
          },
          ai: {
            bg: '#cfd5e0',
            card: '#dae0ea',
            text: '#1a202c',
            textLight: '#2d3748',
          },
          emergency: {
            bg: '#c5ccd9',
            card: '#d0d7e3',
            text: '#0f1419',
            textLight: '#1a202c',
          },
        }
      },
      boxShadow: {
        'neuro': '8px 8px 16px #a3b1c6, -8px -8px 16px #ffffff',
        'neuro-inset': 'inset 8px 8px 16px #a3b1c6, inset -8px -8px 16px #ffffff',
        'neuro-sm': '4px 4px 8px #a3b1c6, -4px -4px 8px #ffffff',
        'neuro-lg': '12px 12px 24px #a3b1c6, -12px -12px 24px #ffffff',
        'neuro-hover': '6px 6px 12px #a3b1c6, -6px -6px 12px #ffffff',
        'neuro-active': 'inset 4px 4px 8px #a3b1c6, inset -4px -4px 8px #ffffff',
        // Checklist shadows (lightest)
        'neuro-checklist': '8px 8px 16px #b8bfc9, -8px -8px 16px #ffffff',
        'neuro-checklist-sm': '4px 4px 8px #b8bfc9, -4px -4px 8px #ffffff',
        // Map shadows (medium)
        'neuro-map': '8px 8px 16px #9ca5b3, -8px -8px 16px #f5f7fa',
        'neuro-map-sm': '4px 4px 8px #9ca5b3, -4px -4px 8px #f5f7fa',
        // AI shadows (darker)
        'neuro-ai': '8px 8px 16px #8891a0, -8px -8px 16px #e8ecf1',
        'neuro-ai-sm': '4px 4px 8px #8891a0, -4px -4px 8px #e8ecf1',
        // Emergency shadows (darkest)
        'neuro-emergency': '8px 8px 16px #7a8394, -8px -8px 16px #dce1e8',
        'neuro-emergency-sm': '4px 4px 8px #7a8394, -4px -4px 8px #dce1e8',
      }
    },
  },
  plugins: [],
}
