'use client'

import { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes, useEffect, useState } from 'react'

/* ── Panel HUD (glassmorphism + esquinas recortadas + glow) ──────── */

export function Card({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <div className={`hud-panel animate-materialize p-5 ${className}`} style={delay ? { animationDelay: `${delay}ms` } : undefined}>
      {children}
    </div>
  )
}

export function PageTitle({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex animate-materialize flex-wrap items-end justify-between gap-3">
      <div>
        <div className="hud-label mb-1">◢ BUSINESS OS // MÓDULO</div>
        <h1 className="glow-text font-title text-2xl font-bold uppercase tracking-[0.12em] text-jarvis-text">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-2xl font-mono text-xs leading-relaxed text-jarvis-dim">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

/* ── Controles ───────────────────────────────────────────────────── */

export function Btn({ variant = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' }) {
  const styles = {
    primary: 'border border-jarvis-cyan/60 bg-jarvis-cyan/15 text-jarvis-glow hover:bg-jarvis-cyan/30 hover:shadow-[0_0_22px_rgba(34,211,238,0.35),inset_0_0_12px_rgba(34,211,238,0.2)] hover:-translate-y-0.5',
    ghost: 'border border-jarvis-line text-jarvis-text/80 hover:border-jarvis-cyan/60 hover:bg-jarvis-cyan/5 hover:text-jarvis-glow hover:shadow-[0_0_15px_rgba(34,211,238,0.15)] hover:-translate-y-0.5',
    danger: 'border border-red-500/40 text-red-400 hover:bg-red-950/50 hover:border-red-500/80 hover:shadow-[0_0_20px_rgba(248,113,113,0.3),inset_0_0_10px_rgba(248,113,113,0.15)] hover:-translate-y-0.5',
  }
  return (
    <button
      className={`px-4 py-2.5 font-mono text-xs uppercase tracking-[0.15em] transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-none [clip-path:polygon(8px_0,100%_0,100%_calc(100%-8px),calc(100%-8px)_100%,0_100%,0_8px)] ${styles[variant]} ${className}`}
      {...props}
    />
  )
}

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`hud-input ${className}`} {...props} />
}

export function Textarea({ className = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`hud-input ${className}`} {...props} />
}

export function Select({ className = '', ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`border border-jarvis-line bg-black/40 px-3 py-2 font-mono text-sm text-jarvis-text outline-none transition focus:border-jarvis-cyan/55 [clip-path:polygon(8px_0,100%_0,100%_calc(100%-8px),calc(100%-8px)_100%,0_100%,0_8px)] ${className}`}
      {...props}
    />
  )
}

/* ── Badges de estado ────────────────────────────────────────────── */

const BADGE: Record<string, string> = {
  pendiente: 'border-jarvis-amber/50 text-jarvis-amber glow-amber',
  ejecutada: 'border-jarvis-cyan/50 text-jarvis-glow',
  completada: 'border-jarvis-cyan/50 text-jarvis-glow',
  rechazada: 'border-jarvis-line text-jarvis-dim',
  analizando: 'border-jarvis-cyan/50 text-jarvis-cyan animate-pulse',
  error: 'border-red-500/50 text-red-400',
}

export function Badge({ children, tone }: { children: ReactNode; tone?: string }) {
  const style = BADGE[tone ?? ''] ?? 'border-jarvis-line text-jarvis-text/70'
  return (
    <span className={`inline-block border bg-black/30 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] ${style}`}>
      {children}
    </span>
  )
}

/* ── Estado de carga: ANALIZANDO… con efecto máquina de escribir ── */

export function Spinner({ label }: { label?: string }) {
  const [dots, setDots] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setDots((d) => (d + 1) % 4), 350)
    return () => clearInterval(t)
  }, [])
  return (
    <span className="inline-flex items-center gap-3 font-mono text-xs uppercase tracking-[0.25em]">
      <span className="glow-text text-jarvis-cyan">▮ ANALIZANDO{'.'.repeat(dots)}<span className="opacity-0">{'.'.repeat(3 - dots)}</span></span>
      {label && <span className="normal-case tracking-normal text-jarvis-dim">{label}</span>}
    </span>
  )
}

/** Texto que se "escribe" progresivamente, estilo terminal. */
export function Typewriter({ text, speed = 3 }: { text: string; speed?: number }) {
  const [len, setLen] = useState(0)
  useEffect(() => {
    setLen(0)
    const t = setInterval(() => {
      setLen((l) => {
        if (l >= text.length) { clearInterval(t); return l }
        return Math.min(l + speed, text.length)
      })
    }, 16)
    return () => clearInterval(t)
  }, [text, speed])
  return <span className={len < text.length ? 'caret' : ''}>{text.slice(0, len)}</span>
}

/** Feedback 👍/👎 — alimenta al Learning Engine. Con 👎 se puede dictar la corrección. */
export function FeedbackButtons({ contexto, referencia, respuesta }: { contexto: 'jarvis' | 'agente'; referencia?: string; respuesta: string }) {
  const [estado, setEstado] = useState<'idle' | 'nota' | 'done'>('idle')
  const [nota, setNota] = useState('')

  async function enviar(voto: 'up' | 'down', notaFinal?: string) {
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contexto, referencia, respuesta, voto, nota: notaFinal }),
      })
    } catch { /* feedback nunca debe romper la UI */ }
    setEstado('done')
  }

  if (estado === 'done') return <span className="font-mono text-[10px] tracking-widest text-jarvis-cyan/70">✓ APRENDIDO</span>

  if (estado === 'nota') {
    return (
      <span className="flex items-center gap-1.5">
        <input
          autoFocus
          className="w-56 border border-jarvis-line bg-black/40 px-2 py-1 font-mono text-[11px] text-jarvis-text outline-none focus:border-jarvis-cyan/50"
          placeholder="¿qué debía responder? (opcional)"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && enviar('down', nota)}
        />
        <button className="font-mono text-[10px] uppercase text-jarvis-cyan hover:text-jarvis-glow" onClick={() => enviar('down', nota)}>OK</button>
      </span>
    )
  }

  return (
    <span className="flex items-center gap-2 opacity-60 transition hover:opacity-100">
      <button title="Correcto — refuerza este enfoque" className="text-sm transition hover:scale-125" onClick={() => enviar('up')}>👍</button>
      <button title="Incorrecto — el OS aprenderá a no repetirlo" className="text-sm transition hover:scale-125" onClick={() => setEstado('nota')}>👎</button>
    </span>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="animate-materialize border border-dashed border-jarvis-line/70 bg-black/20 p-8 text-center font-mono text-xs text-jarvis-dim">
      <span className="text-jarvis-cyan/50">//</span> {children}
    </div>
  )
}

/* ── Anillo de progreso SVG ──────────────────────────────────────── */

export function Ring({ pct, size = 64, label, sub }: { pct: number | null; size?: number; label: string; sub?: string }) {
  const r = (size - 8) / 2
  const c = 2 * Math.PI * r
  const clamped = pct === null ? 0 : Math.max(0, Math.min(100, pct))
  return (
    <div className="flex items-center gap-3">
      <svg width={size} height={size} className="shrink-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(18,48,71,0.9)" strokeWidth="3" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#22d3ee" strokeWidth="3" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (c * clamped) / 100}
          style={{ filter: 'drop-shadow(0 0 5px rgba(34,211,238,0.6))', transition: 'stroke-dashoffset 1.2s cubic-bezier(0.16,1,0.3,1)' }} />
        <circle cx={size / 2} cy={size / 2} r={r - 7} fill="none" stroke="rgba(34,211,238,0.12)" strokeWidth="1" strokeDasharray="2 5" />
      </svg>
      <div className="min-w-0">
        <div className="truncate font-mono text-sm text-jarvis-text">{label}</div>
        {sub && <div className="truncate font-mono text-[11px] text-jarvis-dim">{sub}</div>}
        {pct !== null && <div className="font-mono text-[10px] tracking-widest text-jarvis-cyan">{Math.round(clamped)}%</div>}
      </div>
    </div>
  )
}

/* ── Radar decorativo (barrido animado) ──────────────────────────── */

export function Radar({ size = 120 }: { size?: number }) {
  const cx = size / 2
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="opacity-80">
      {[0.98, 0.72, 0.46, 0.2].map((k, i) => (
        <circle key={i} cx={cx} cy={cx} r={(cx - 2) * k} fill="none" stroke="rgba(34,211,238,0.18)" strokeWidth="1" />
      ))}
      <line x1={2} y1={cx} x2={size - 2} y2={cx} stroke="rgba(34,211,238,0.12)" strokeWidth="1" />
      <line x1={cx} y1={2} x2={cx} y2={size - 2} stroke="rgba(34,211,238,0.12)" strokeWidth="1" />
      <g className="origin-center animate-sweep">
        <path d={`M ${cx} ${cx} L ${cx} 3 A ${cx - 3} ${cx - 3} 0 0 1 ${cx + (cx - 3) * 0.5} ${cx - (cx - 3) * 0.866} Z`}
          fill="url(#radarGrad)" />
        <line x1={cx} y1={cx} x2={cx} y2={3} stroke="#22d3ee" strokeWidth="1.5" style={{ filter: 'drop-shadow(0 0 4px #22d3ee)' }} />
      </g>
      <defs>
        <linearGradient id="radarGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(34,211,238,0.35)" />
          <stop offset="100%" stopColor="rgba(34,211,238,0)" />
        </linearGradient>
      </defs>
      <circle cx={cx} cy={cx} r="2.5" fill="#22d3ee" style={{ filter: 'drop-shadow(0 0 6px #22d3ee)' }} />
    </svg>
  )
}
