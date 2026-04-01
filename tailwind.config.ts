import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './tests/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: 'var(--bg-primary)',
          surface: 'var(--bg-surface)',
          elevated: 'var(--bg-elevated)'
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)'
        },
        accent: {
          primary: 'var(--accent-primary)',
          hover: 'var(--accent-hover)',
          subtle: 'var(--accent-subtle)'
        },
        border: {
          default: 'var(--border-default)',
          accent: 'var(--border-accent)'
        }
      },
      fontFamily: {
        sans: ['var(--font-jakarta)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'monospace']
      },
      fontSize: {
        hero: ['clamp(2.125rem, 5vw, 3.75rem)', { lineHeight: '1.08' }],
        h2: ['clamp(1.5rem, 3vw, 2.25rem)', { lineHeight: '1.2' }],
        h3: ['clamp(1.125rem, 2vw, 1.5rem)', { lineHeight: '1.3' }],
        body: ['clamp(0.9375rem, 1.5vw, 1.125rem)', { lineHeight: '1.6' }],
        small: ['clamp(0.75rem, 1.2vw, 0.875rem)', { lineHeight: '1.5' }],
        mono: ['clamp(0.75rem, 1.2vw, 0.875rem)', { lineHeight: '1.4' }]
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        '2xl': '48px',
        '3xl': '80px'
      },
      borderRadius: {
        control: '14px',
        content: '18px',
        vessel: '24px',
        shell: '30px',
        pill: '999px'
      },
      boxShadow: {
        card: 'var(--shadow-card)'
      },
      maxWidth: {
        shell: '1400px',
        content: '1200px'
      },
      transitionDuration: {
        fast: '150ms',
        normal: '200ms',
        slow: '300ms'
      }
    }
  },
  plugins: []
};

export default config;
