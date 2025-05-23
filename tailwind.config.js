/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        blue: {
          900: '#0A2463', // Primary dark blue
          800: '#1D3461',
          700: '#2E4172',
          600: '#3E5084',
          500: '#4F5F96',
          400: '#6F7CAB',
          300: '#8F99C1',
          200: '#AFB6D6',
          100: '#CFD3EB',
        },
        teal: {
          900: '#0A6354',
          800: '#0E7A67',
          700: '#12917A',
          600: '#16A78D',
          500: '#1ABDA0',
          400: '#3FCDB3',
          300: '#64DDC6',
          200: '#89EDD9',
          100: '#AEFDED',
        },
        orange: {
          900: '#7D3302',
          800: '#944003',
          700: '#AC4D04',
          600: '#C35A05',
          500: '#DA6B07',
          400: '#F97B08',
          300: '#FB953C',
          200: '#FCAE70',
          100: '#FEC8A4',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      spacing: {
        '72': '18rem',
        '84': '21rem',
        '96': '24rem',
      },
      animation: {
        fadeIn: 'fadeIn 0.5s ease-out',
        slideUp: 'slideUp 0.5s ease-out',
      },
    },
  },
  plugins: [],
};