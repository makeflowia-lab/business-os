import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        jarvis: {
          bg: '#05070d',
          panel: '#0a1420',
          line: '#123047',
          cyan: '#22d3ee',
          glow: '#67e8f9',
          amber: '#fbbf24',
          text: '#d7f0fa',
          dim: '#6b8ba0',
        },
        // Alias heredados (mapeados a la paleta JARVIS)
        bo: {
          bg: '#05070d',
          panel: '#0a1420',
          border: '#123047',
          accent: '#22d3ee',
          accent2: '#67e8f9',
        },
      },
      fontFamily: {
        title: ['var(--font-title)', 'ui-sans-serif', 'system-ui'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      keyframes: {
        materialize: {
          '0%': { opacity: '0', transform: 'translateY(10px) scale(0.985)', filter: 'blur(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)', filter: 'blur(0)' },
        },
        sweep: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        corepulse: {
          '0%, 100%': { boxShadow: '0 0 30px rgba(34,211,238,0.25), inset 0 0 40px rgba(34,211,238,0.08)' },
          '50%': { boxShadow: '0 0 70px rgba(34,211,238,0.45), inset 0 0 60px rgba(34,211,238,0.16)' },
        },
        ringspin: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(-360deg)' },
        },
        blink: {
          '0%, 49%': { opacity: '1' },
          '50%, 100%': { opacity: '0' },
        },
        scanmove: {
          '0%': { top: '-10%' },
          '100%': { top: '110%' },
        },
        dash: {
          '0%': { strokeDashoffset: 'var(--dash-from, 300)' },
          '100%': { strokeDashoffset: 'var(--dash-to, 0)' },
        },
      },
      animation: {
        materialize: 'materialize 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
        sweep: 'sweep 4s linear infinite',
        corepulse: 'corepulse 3.5s ease-in-out infinite',
        ringspin: 'ringspin 24s linear infinite',
        blink: 'blink 1s step-end infinite',
        scanmove: 'scanmove 9s linear infinite',
      },
    },
  },
  plugins: [],
}

export default config
