/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0F4C81',
          foreground: '#FFFFFF',
        },
        secondary: '#E8F1F8',
        accent: '#C9A227',
        success: '#16A34A',
        warning: '#EA580C',
        destructive: '#DC2626',
        muted: '#64748B',
        background: '#FAFBFC',
        card: '#FFFFFF',
        border: '#E2E8F0',
      },
      fontFamily: {
        sans: ['Inter', 'Be Vietnam Pro', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        sm: '0 1px 2px rgba(0,0,0,0.05)',
        md: '0 4px 12px rgba(0,0,0,0.08)',
        lg: '0 8px 24px rgba(0,0,0,0.12)',
      },
    },
  },
  plugins: [],
};
