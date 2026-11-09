/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#060d24',
          900: '#0a1736',
          800: '#0f2150',
          700: '#162e66',
        },
        yellow: {
          DEFAULT: '#ffd60a',
          dark: '#f5c400',
        },
      },
    },
  },
  plugins: [],
};
