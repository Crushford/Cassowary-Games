/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4f46e5',
          hover: '#6366f1',
        },
        secondary: {
          DEFAULT: '#e11d48',
          hover: '#f43f5e',
        },
        background: {
          DEFAULT: '#0f172a',
        },
        surface: {
          DEFAULT: '#1e293b',
        },
        text: {
          DEFAULT: '#f8fafc',
        },
        group: {
          red: {
            700: '#b91c1c',
            900: '#7f1d1d',
          },
          blue: {
            700: '#1d4ed8',
            900: '#1e3a8a',
          },
          green: {
            700: '#15803d',
            900: '#14532d',
          },
          yellow: {
            700: '#a16207',
            900: '#713f12',
          },
          purple: {
            700: '#7e22ce',
            900: '#4c1d95',
          },
          pink: {
            700: '#be185d',
            900: '#831843',
          },
        },
      },
    },
  },
  plugins: [],
};
