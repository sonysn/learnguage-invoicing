/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#7364E0',
          base: '#7364E0',
          light: '#8B7FE6',
          dark: '#5C4FC7',
        },
        secondary: {
          DEFAULT: '#30BEAD',
          base: '#30BEAD',
          light: '#55CABB',
          dark: '#269889',
        },
        neutral: {
          DEFAULT: '#7B7B8A',
          base: '#7B7B8A',
          light: '#A5A5B0',
          dark: '#5D5D6A',
        },
        background: {
          white: '#FFFFFF',
          'off-white': '#F7F7FA',
          'light-surface': '#EEEEF2',
        },
        text: {
          primary: '#000000',
          secondary: '#2B2B32',
          muted: '#7B7B8A',
        },
      },
      fontFamily: {
        numbers: ['Space Grotesk', 'sans-serif'],
        body: ['Georama', 'sans-serif'],
        heading: ['Marcellus', 'serif'],
      },
    },
  },
  plugins: [],
}
