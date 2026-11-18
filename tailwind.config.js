// Lets utilities like bg-accent/15 work with CSS-variable colors.
const c = (name) => ({ opacityValue }) =>
  opacityValue === undefined
    ? `var(${name})`
    : `color-mix(in srgb, var(${name}) ${Math.round(Number(opacityValue) * 100)}%, transparent)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./popup.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: c('--bg'),
        surface: c('--surface'),
        surface2: c('--surface-2'),
        line: c('--border'),
        fg: c('--fg'),
        muted: c('--muted'),
        accent: c('--accent'),
        'accent-text': c('--accent-text'),
        'on-accent': c('--on-accent'),
        ok: c('--ok'),
        warn: c('--warn'),
        bad: c('--bad'),
        info: c('--info'),
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      boxShadow: { soft: 'var(--shadow)' },
    },
  },
  plugins: [],
};
