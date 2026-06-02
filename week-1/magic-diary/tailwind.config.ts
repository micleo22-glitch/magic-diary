import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'bg-dark': '#1A0A06',
        'bg-parchment': '#F5EDD8',
        'bg-parchment-dark': '#E8DCC0',
        'sidebar-bg': '#2C0F0A',
        'gold': '#C9993F',
        'gold-light': '#F0C96A',
        'text-primary': '#2B1A0F',
        'text-secondary': '#7A5C42',
        'danger': '#8B1A1A',
      },
      fontFamily: {
        playfair: ['var(--font-playfair)', 'Georgia', 'serif'],
        lora: ['var(--font-lora)', 'Georgia', 'serif'],
        cinzel: ['var(--font-cinzel)', 'serif'],
        'im-fell': ['var(--font-im-fell)', 'serif'],
      },
      typography: {
        DEFAULT: {
          css: {
            color: '#2B1A0F',
            fontFamily: 'var(--font-lora)',
          },
        },
      },
    },
  },
  plugins: [],
}

export default config
