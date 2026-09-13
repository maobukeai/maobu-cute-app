/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // ── Semantic design tokens ─────────────────────────────────
      // All values bridge to CSS variables in src/index.css so that
      // dark mode and accent switching work through a single source.
      colors: {
        canvas: 'rgb(var(--canvas) / <alpha-value>)',        // page background
        surface: 'rgb(var(--surface) / <alpha-value>)',      // cards / sheets
        'surface-2': 'rgb(var(--surface-2) / <alpha-value>)', // inputs, subtle fills
        ink: 'rgb(var(--ink) / <alpha-value>)',              // primary text
        'ink-2': 'rgb(var(--ink-2) / <alpha-value>)',        // secondary text
        'ink-3': 'rgb(var(--ink-3) / <alpha-value>)',        // tertiary text
        line: 'rgb(var(--line) / <alpha-value>)',            // hairline borders
        accent: 'rgb(var(--accent-rgb) / <alpha-value>)',    // runtime-switchable accent
        'accent-soft': 'var(--theme-accent-light)',          // pre-mixed tint (no alpha)
        danger: 'rgb(244 63 94 / <alpha-value>)',            // rose-500
        warn: 'rgb(245 158 11 / <alpha-value>)',             // amber-500
        ok: 'rgb(16 185 129 / <alpha-value>)',               // emerald-500

        // Legacy palettes kept for components not yet migrated
        wechat: {
          green: '#07C160',
          'green-dark': '#06AD56',
          'green-light': '#E8F8F0',
          bubble: '#95EC69',
          'bubble-dark': '#2A7A38',
          bg: '#F8F9FA',
          'bg-dark': '#0A0A0C',
          card: '#FFFFFF',
          'card-dark': '#1E1E1E',
          divider: '#E5E5E5',
          'divider-dark': '#2C2C2C',
        },
        catpaw: {
          pink: '#FF6B8B',
          'pink-hover': '#FA5276',
          'pink-light': '#FFF0F3',
          accent: '#FF85A1',
          glow: 'rgba(255, 107, 139, 0.35)',
        },
        apple: {
          blue: '#0A84FF',
          indigo: '#5E5CE6',
          purple: '#BF5AF2',
          orange: '#FF9F0A',
          red: '#FF453A',
          yellow: '#FFD60A',
          green: '#30D158',
          gray1: '#8E8E93',
          gray2: '#AEAEB2',
          gray3: '#C7C7CC',
          gray4: '#D1D1D6',
          gray5: '#E5E5EA',
          gray6: '#F2F2F7',
          'bg-dark': '#0A0A0C',
          'card-dark': '#18181D',
          'surface-dark': '#24242C',
        }
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Text"',
          '"SF Pro Display"',
          'system-ui',
          '"PingFang SC"',
          '"HarmonyOS Sans SC"',
          '"MiSans"',
          '"Hiragino Sans GB"',
          '"Microsoft YaHei"',
          'sans-serif'
        ],
        mono: [
          '"SF Mono"',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace'
        ]
      },
      // ── Type scale (minimum readable size = 12px) ──────────────
      fontSize: {
        display: ['28px', { lineHeight: '1.25', letterSpacing: '-0.02em', fontWeight: '700' }],
        title: ['22px', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '700' }],
        headline: ['17px', { lineHeight: '1.4', fontWeight: '600' }],
        body: ['15px', { lineHeight: '1.55' }],
        sub: ['13px', { lineHeight: '1.5' }],
        caption: ['12px', { lineHeight: '1.45' }],
      },
      borderRadius: {
        card: '20px',
        sheet: '28px',
        island: '32px',
      },
      boxShadow: {
        'elev-1': '0 1px 2px rgba(0, 0, 0, 0.04), 0 1px 6px -2px rgba(0, 0, 0, 0.03)',
        'elev-2': '0 4px 20px -2px rgba(0, 0, 0, 0.06), 0 2px 6px -1px rgba(0, 0, 0, 0.03)',
        'elev-3': '0 16px 40px -8px rgba(0, 0, 0, 0.14), 0 0 0 1px rgba(0, 0, 0, 0.02)',
        'ios-sm': '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.02)',
        'ios-card': '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.02)',
        'ios-float': '0 12px 32px -4px rgba(0, 0, 0, 0.08), 0 4px 12px -2px rgba(0, 0, 0, 0.03)',
        'ios-hover': '0 10px 25px -3px rgba(0, 0, 0, 0.08), 0 4px 10px -2px rgba(0, 0, 0, 0.04)',
        'ios-modal': '0 24px 48px -12px rgba(0, 0, 0, 0.18), 0 8px 24px -4px rgba(0, 0, 0, 0.08)',
        'tabbar': '0 -1px 0 0 rgba(0, 0, 0, 0.06), 0 -8px 24px -4px rgba(0, 0, 0, 0.03)',
        'tabbar-dark': '0 -1px 0 0 rgba(255, 255, 255, 0.06), 0 -8px 24px -4px rgba(0, 0, 0, 0.4)',
        'glow-accent': '0 4px 20px -2px var(--theme-accent-glow, rgba(7, 193, 96, 0.35))',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      animation: {
        'scale-in': 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'bounce-subtle': 'bounceSubtle 0.5s ease-in-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'jelly': 'jelly 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.08)' },
        },
        jelly: {
          '0%': { transform: 'scale(1, 1)' },
          '30%': { transform: 'scale(1.15, 0.85)' },
          '50%': { transform: 'scale(0.95, 1.05)' },
          '70%': { transform: 'scale(1.03, 0.97)' },
          '100%': { transform: 'scale(1, 1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-4px)' },
        }
      }
    },
  },
  plugins: [],
}
