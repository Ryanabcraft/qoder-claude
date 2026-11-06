import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'var(--bg)',
        foreground: 'var(--ink)',
        border: 'var(--line)',
        card: { DEFAULT: 'var(--panel)', foreground: 'var(--ink)' },
        muted: { DEFAULT: 'var(--panel)', foreground: 'var(--muted)' },
        primary: { DEFAULT: 'var(--accent)', foreground: 'var(--bg)' },
        accent: { DEFAULT: 'var(--accent-2)', foreground: 'var(--bg)' },
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
