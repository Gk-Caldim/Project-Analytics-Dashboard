/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
        outfit: ['Outfit', 'sans-serif'],
      },
      colors: {
        maroon: {
          50: '#fdf2f2',
          100: '#fce8e8',
          200: '#fad5d5',
          300: '#f8b4b4',
          400: '#f98080',
          500: '#f05252',
          600: '#e02424',
          700: '#800000', // This is maroon
          800: '#5c0000', // Darker maroon
          900: '#380000', // Even darker maroon
        },
      },
    },
  },
  plugins: [
    require('tailwind-scrollbar'), // This line adds the plugin
  ],
}