import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'rgb(var(--bg-rgb) / <alpha-value>)',
        foreground: 'rgb(var(--ink-rgb) / <alpha-value>)',
        border: 'rgb(var(--line-rgb) / <alpha-value>)',
        card: {
          DEFAULT: 'rgb(var(--panel-rgb) / <alpha-value>)',
          foreground: 'rgb(var(--ink-rgb) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'rgb(var(--panel-rgb) / <alpha-value>)',
          foreground: 'rgb(var(--muted-rgb) / <alpha-value>)',
        },
        primary: {
          DEFAULT: 'rgb(var(--accent-rgb) / <alpha-value>)',
          foreground: 'rgb(var(--bg-rgb) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent-2-rgb) / <alpha-value>)',
          foreground: 'rgb(var(--bg-rgb) / <alpha-value>)',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      keyframes: {
        pulseLine: {
          '0%': { offsetDistance: '0%', opacity: '0' },
          '10%': { opacity: '1' },
          '90%': { opacity: '1' },
          '100%': { offsetDistance: '100%', opacity: '0' },
        },
        rise: {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        rise: 'rise 0.7s cubic-bezier(.2,.7,.2,1) both',
      },
    },
  },
  plugins: [animate],
} satisfies Config;
