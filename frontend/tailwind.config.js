/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        // Industrial Design System Colors
        app: {
          bg: '#F8FAFC',
          surface: '#FFFFFF',
          panel: '#F1F5F9',
        },
        brand: {
          primary: '#2563EB',
          accent: '#0891B2',
          hover: '#3B82F6',
        },
        text: {
          primary: '#0F172A',
          secondary: '#475569',
          muted: '#64748B',
        },
        border: {
          DEFAULT: '#CBD5E1',
          strong: '#94A3B8',
        },
        status: {
          success: '#10B981',
          warning: '#F59E0B',
          error: '#EF4444',
          info: '#2563EB',
          neutral: '#64748B',
        },
        // Legacy maroon colors for backward compatibility
        maroon: {
          50: '#fdf2f2',
          100: '#fce8e8',
          200: '#fad5d5',
          300: '#f8b4b4',
          400: '#f98080',
          500: '#f05252',
          600: '#e02424',
          700: '#800000',
          800: '#5c0000',
          900: '#380000',
        },
      },
      spacing: {
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
      },
      borderRadius: {
        'sm': '4px',    // Inputs, status badges
        'md': '6px',    // Buttons
        'lg': '8px',    // Stat cards, project cards, settings panels
        'xl': '12px',   // Modals
        'sidebar': '0 6px 6px 0', // Sidebar active item
      },
      fontSize: {
        'display': ['32px', { lineHeight: '1.25', fontWeight: '700' }],
        'h1': ['28px', { lineHeight: '1.25', fontWeight: '600' }],
        'h2': ['24px', { lineHeight: '1.25', fontWeight: '600' }],
        'h3': ['20px', { lineHeight: '1.25', fontWeight: '600' }],
        'body-lg': ['16px', { lineHeight: '1.5' }],
        'body': ['14px', { lineHeight: '1.5' }],
        'body-sm': ['13px', { lineHeight: '1.5' }],
        'label': ['12px', { lineHeight: '1.5', fontWeight: '500' }],
        'caption': ['11px', { lineHeight: '1.5' }],
      },
      boxShadow: {
        'sm': '0 1px 2px rgba(26, 31, 46, 0.04)',
        'md': '0 2px 8px rgba(26, 31, 46, 0.06)',
        'lg': '0 4px 16px rgba(26, 31, 46, 0.08)',
        'xl': '0 8px 32px rgba(26, 31, 46, 0.12)',
      },
      transitionTimingFunction: {
        'product': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      transitionDuration: {
        'fast': '150ms',
        'normal': '250ms',
        'slow': '350ms',
      },
    },
  },
  plugins: [],
}