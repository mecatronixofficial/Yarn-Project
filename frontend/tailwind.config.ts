import type { Config } from 'tailwindcss';
export default {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: '#e5e7eb',
        background: '#f5f7f8',
        foreground: '#13201b',
        primary: { DEFAULT: '#143b32', foreground: '#ffffff' },
        accent: { DEFAULT: '#d3a64c', foreground: '#143b32' },
        muted: { DEFAULT: '#eef1f0', foreground: '#64706b' }
      },
      boxShadow: { card: '0 12px 35px -24px rgba(20,59,50,.35)' }
    }
  },
  plugins: []
} satisfies Config;
