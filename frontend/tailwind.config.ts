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
        primary: { DEFAULT: '#1b3c55', foreground: '#ffffff' },
        accent: { DEFAULT: '#d3a64c', foreground: '#1b3c55' },
        muted: { DEFAULT: '#eef1f0', foreground: '#64706b' }
      },
      boxShadow: { card: '0 12px 35px -24px rgba(27,60,85,.35)' }
    }
  },
  plugins: []
} satisfies Config;
