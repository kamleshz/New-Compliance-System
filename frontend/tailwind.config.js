export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f3f7f9',
          100: '#e7eff3',
          200: '#cbdde5',
          300: '#a3c2cf',
          400: '#73a1b3',
          500: '#5484a4',
          600: '#3e687f',
          700: '#30525c',
          800: '#29444c',
          900: '#243a40',
          950: '#111f24',
        },
      },
      boxShadow: {
        card: '0 18px 44px rgba(15, 23, 42, 0.07)',
        'card-hover': '0 22px 52px rgba(15, 23, 42, 0.11)',
        popover: '0 20px 50px rgba(15, 23, 42, 0.16)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  darkMode: 'class',
  plugins: [],
};
