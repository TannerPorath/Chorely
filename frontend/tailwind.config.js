/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Inter Tight"', 'Inter', 'system-ui', 'sans-serif'],
        'display-fraunces': ['Fraunces', 'Georgia', 'serif'],
        fraunces: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Nunito', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        brand: '#FFC233',
        paper: '#FAF7F2',
        ink: {
          50:  '#F6F5F2',
          100: '#ECEAE5',
          200: '#DCD8D1',
          300: '#C4BFB6',
          500: '#86827B',
          700: '#403D38',
          900: '#1A1916',
        },
        ok:  '#10B981',
        bad: '#EF4444',
      },
      boxShadow: {
        glow: '0 8px 24px -8px color-mix(in oklab, var(--u) 55%, transparent)',
      },
      height: {
        13: '3.25rem',
      },
    },
  },
  plugins: [],
};
