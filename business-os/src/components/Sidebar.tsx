'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/', label: 'Cerebro', icon: '◉' },
  { href: '/roi', label: 'ROI', icon: '◔' },
  { href: '/kpis', label: 'Telemetría', icon: '▦' },
  { href: '/memoria', label: 'Memoria', icon: '≡' },
  { href: '/constitucion', label: 'Constitución', icon: '§' },
  { href: '/conocimiento', label: 'Conocimiento', icon: '▤' },
  { href: '/empresa', label: 'Empresa', icon: '⬡' },
  { href: '/decisiones', label: 'Decisiones', icon: '◎' },
  { href: '/agentes', label: 'Agentes', icon: '⌬' },
  { href: '/acciones', label: 'Acciones', icon: '⚡' },
  { href: '/automatizacion', label: 'Automatización', icon: '⏱' },
  { href: '/gobierno', label: 'Gobierno', icon: '⛨' },
  { href: '/equipo', label: 'EQUIPO', icon: '👥' },
]

export function Sidebar() {
  const pathname = usePathname()
  const [nucleo, setNucleo] = useState<'operativo' | 'degradado' | 'critico'>('operativo')

  useEffect(() => {
    const check = () =>
      fetch('/api/health').then((r) => r.json()).then((h) => setNucleo(h.nucleo ?? 'operativo')).catch(() => setNucleo('critico'))
    check()
    const t = setInterval(check, 60_000)
    return () => clearInterval(t)
  }, [])

  const DOT = { operativo: 'bg-jarvis-cyan', degradado: 'bg-jarvis-amber', critico: 'bg-red-500' }[nucleo]
  const LABEL = { operativo: 'EN LÍNEA', degradado: 'DEGRADADO', critico: 'CRÍTICO' }[nucleo]

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-16 flex-col items-center border-r border-jarvis-line/60 bg-black/40 backdrop-blur-md">
      {/* Núcleo del logo */}
      <Link href="/" className="group relative mt-4 flex h-10 w-10 items-center justify-center">
        <span className="absolute inset-0 rounded-full border border-jarvis-cyan/40 transition group-hover:border-jarvis-cyan" />
        <span className="absolute inset-1.5 animate-corepulse rounded-full border border-jarvis-cyan/60" />
        <span className="glow-text font-title text-xs font-bold text-jarvis-glow">OS</span>
      </Link>
      <div className="my-4 h-px w-8 bg-jarvis-line" />

      <nav className="flex flex-1 flex-col items-center gap-1.5 overflow-y-auto no-scrollbar w-full py-2">
        {NAV.map((item, i) => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group relative flex h-11 w-11 animate-materialize items-center justify-center"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              {/* Indicador lateral activo */}
              <span className={`absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 transition ${active ? 'bg-jarvis-cyan shadow-[0_0_8px_#22d3ee]' : 'bg-transparent'}`} />
              <span
                className={`flex h-9 w-9 items-center justify-center border text-base transition [clip-path:polygon(6px_0,100%_0,100%_calc(100%-6px),calc(100%-6px)_100%,0_100%,0_6px)] ${
                  active
                    ? 'glow-text border-jarvis-cyan/60 bg-jarvis-cyan/15 text-jarvis-glow'
                    : 'border-transparent text-jarvis-dim hover:border-jarvis-line hover:text-jarvis-text'
                }`}
              >
                {item.icon}
              </span>
              {/* Tooltip HUD */}
              <span className="pointer-events-none absolute left-14 z-50 whitespace-nowrap border border-jarvis-cyan/30 bg-black/90 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-jarvis-glow opacity-0 transition group-hover:opacity-100">
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* Estado real del sistema (latido de /api/health cada 60 s) */}
      <Link href="/gobierno" className="mb-4 flex flex-col items-center gap-1.5" title="Salud del sistema — ver Gobierno">
        <span className="relative flex h-2 w-2">
          <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${DOT}`} />
          <span className={`relative inline-flex h-2 w-2 rounded-full ${DOT}`} />
        </span>
        <span className="hud-label rotate-180 [writing-mode:vertical-rl]">{LABEL}</span>
      </Link>
    </aside>
  )
}
