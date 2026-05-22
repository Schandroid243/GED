import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class', // piloté par next-themes via classe sur <html>
  theme: {
    extend: {
      // ── Palette sobre et premium ───────────────────────
      colors: {
        // Neutres (base des surfaces)
        neutral: {
          0:    '#ffffff',
          50:   '#f8f8f7',
          100:  '#f0efee',
          200:  '#e4e2e0',
          300:  '#cbc8c4',
          400:  '#a09c97',
          500:  '#78746f',
          600:  '#5a5651',
          700:  '#3f3c39',
          800:  '#282624',
          900:  '#161513',
          950:  '#0d0c0b',
        },
        // Accent principal : vert ardoise (sobre, B2B)
        accent: {
          50:  '#f0f4f0',
          100: '#dce8dc',
          200: '#b9d1b9',
          300: '#8fb38f',
          400: '#638f63',
          500: '#426e42', // ← couleur principale
          600: '#325432',
          700: '#253e25',
          800: '#192a19',
          900: '#0e180e',
        },
        // Statuts sémantiques
        success:  { DEFAULT: '#2d6a4f', light: '#d8f3dc', dark: '#1b4332' },
        warning:  { DEFAULT: '#b5621a', light: '#fde8d0', dark: '#7c3f0f' },
        danger:   { DEFAULT: '#9b1c1c', light: '#fde8e8', dark: '#641e16' },
        info:     { DEFAULT: '#1e4d78', light: '#dbeafe', dark: '#1e3a5f' },
      },

      // ── Typographie ─────────────────────────────────────
      fontFamily: {
        // Display : titres, KPIs, headings
        display: ['"DM Serif Display"', 'Georgia', 'serif'],
        // Corps : UI, labels, paragraphes
        body:    ['"DM Sans"', 'system-ui', 'sans-serif'],
        // Mono : code, hashes, identifiants
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },

      // ── Ombres raffinées ────────────────────────────────
      boxShadow: {
        'card-light': '0 1px 3px 0 rgba(0,0,0,.06), 0 1px 2px -1px rgba(0,0,0,.04)',
        'card-dark':  '0 1px 3px 0 rgba(0,0,0,.40), 0 1px 2px -1px rgba(0,0,0,.30)',
        'modal':      '0 20px 60px -10px rgba(0,0,0,.25)',
        'dropdown':   '0 4px 24px -4px rgba(0,0,0,.18)',
      },

      // ── Animations ──────────────────────────────────────
      keyframes: {
        'fade-in':    { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'slide-left': { from: { opacity: '0', transform: 'translateX(16px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        'pulse-dot':  { '0%,100%': { opacity: '1' }, '50%': { opacity: '.4' } },
      },
      animation: {
        'fade-in':    'fade-in 0.2s ease-out both',
        'slide-left': 'slide-left 0.25s ease-out both',
        'pulse-dot':  'pulse-dot 1.4s ease-in-out infinite',
      },

      borderRadius: {
        DEFAULT: '0.5rem',
        xl:      '0.875rem',
        '2xl':   '1.25rem',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
};

export default config;
