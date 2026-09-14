import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#dbe6fe',
          200: '#bdd2fe',
          300: '#8fb4fd',
          400: '#598cf9',
          500: '#3567f2',
          600: '#2249e6',
          700: '#1c39c9',
          800: '#1c33a3',
          900: '#1c2f81',
          950: '#151d4e',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
