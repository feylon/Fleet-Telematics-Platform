import type { Config } from 'tailwindcss';

export default {
  content: ['./components/**/*.vue', './layouts/**/*.vue', './pages/**/*.vue', './app.vue', './plugins/**/*.ts', './composables/**/*.ts', './utils/**/*.ts'],
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        'primary-soft': 'var(--color-primary-soft)',
        'primary-strong': 'var(--color-primary-strong)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: 'var(--shadow-sm)',
        float: 'var(--shadow-md)',
        pop: 'var(--shadow-lg)',
      },
    },
  },
  plugins: [],
} satisfies Config;
