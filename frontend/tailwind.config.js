/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg:      '#050403',
        card:    '#140f0a',
        'card-2':'#1f1812',
        liner:   'rgba(255,255,255,0.07)',
        text:    '#f4f1ec',
        muted:   '#9a8f81',
        green:   '#34e08a',
        gold:    '#ffcf4d',
        purple:  '#9d7bff',
        pink:    '#ff6fae',
        blue:    '#5bb8ff',
        // keep tier colors for bot cards
        tier: {
          basic:   '#6B7280',
          bronze:  '#CD7F32',
          silver:  '#C0C0C0',
          gold:    '#FFD700',
          diamond: '#B9F2FF',
        },
        // backward-compat aliases still used in a few files
        brand: {
          cyan:    '#5bb8ff',
          purple:  '#9d7bff',
          darkbg:  '#050403',
          card:    '#140f0a',
          border:  'rgba(255,255,255,0.07)',
        },
      },
      fontFamily: {
        display: ['Sora', 'Archivo Black', 'system-ui', 'sans-serif'],
        sans:    ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-glow': 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,207,77,0.07) 0%, rgba(157,123,255,0.05) 50%, transparent 100%)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
};
