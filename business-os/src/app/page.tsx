'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api, fecha } from '@/lib/client'
import { Btn, Spinner } from '@/components/ui'
import { Sphere } from '@/components/Sphere'

interface Summary {
  constitution: { empresa: string; version: number } | null
  counts: { documentos: string; chunks: string; entidades: string; decisiones: string; acciones_pendientes: string; agentes: string }
  memory: Array<{ tipo: string; titulo: string; created_at: string }>
  decisions: Array<{ id: string; pregunta: string; estado: string }>
  kpis: Array<{ nombre: string; unidad: string | null; ultimo_valor: string | null }>
}

// Posiciones orbitales de los 6 accesos alrededor de la esfera
const ORBIT = [
  { left: '50%', top: '6%' },
  { left: '88%', top: '28%' },
  { left: '88%', top: '72%' },
  { left: '50%', top: '94%' },
  { left: '12%', top: '72%' },
  { left: '12%', top: '28%' },
]

export default function Dashboard() {
  const [summary, setSummary] = useState<Summary | null>(null)

  useEffect(() => {
    api<Summary>('/api/summary').then(setSummary).catch(console.error)
  }, [])

  if (!summary) return <div className="pt-24 text-center"><Spinner label="estableciendo enlace con el Enterprise Brain…" /></div>

  const stats = [
    { label: 'Documentos', value: summary.counts.documentos, href: '/conocimiento' },
    { label: 'Telemetría', value: summary.kpis.length, href: '/kpis' },
    { label: 'Entidades', value: summary.counts.entidades, href: '/empresa' },
    { label: 'Decisiones', value: summary.counts.decisiones, href: '/decisiones' },
    { label: 'Pendientes', value: summary.counts.acciones_pendientes, href: '/acciones', alerta: Number(summary.counts.acciones_pendientes) > 0 },
    { label: 'Agentes', value: summary.counts.agentes, href: '/agentes' },
  ]

  // Ticker: actividad reciente + KPIs con valor
  const tickerItems = [
    ...summary.memory.map((m) => `⟨${m.tipo.toUpperCase()}⟩ ${m.titulo} · ${fecha(m.created_at)}`),
    ...summary.kpis.filter((k) => k.ultimo_valor).map((k) => `▦ ${k.nombre}: ${k.ultimo_valor}${k.unidad ? ` ${k.unidad}` : ''}`),
  ]
  const ticker = tickerItems.length ? tickerItems : ['SISTEMA EN ESPERA — alimenta el núcleo con conocimiento, entidades y KPIs']

  return (
    <div className="flex h-[calc(100vh-160px)] min-h-[480px] flex-col">
      {/* ── Centro de mando: esfera + órbita (una sola pantalla) ──── */}
      <div className="core-grid relative flex-1 animate-materialize">
        {/* Líneas de conexión */}
        <svg className="absolute inset-0 hidden h-full w-full md:block" aria-hidden>
          {ORBIT.map((p, i) => (
            <line key={i} x1="50%" y1="50%" x2={p.left} y2={p.top} stroke="rgba(34,211,238,0.13)" strokeWidth="1" strokeDasharray="3 6" />
          ))}
        </svg>

        {/* Esfera holográfica */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <Sphere
            size={300}
            label={summary.constitution ? summary.constitution.empresa.slice(0, 16) : 'B.OS'}
            sub={summary.constitution ? `CONST. V${summary.constitution.version} · OPERATIVO` : 'SIN CONSTITUCIÓN'}
          />
        </div>

        {/* Accesos orbitando (desktop) */}
        {stats.map((s, i) => (
          <Link
            key={s.label}
            href={s.href}
            className="absolute z-10 hidden -translate-x-1/2 -translate-y-1/2 animate-materialize md:block"
            style={{ left: ORBIT[i].left, top: ORBIT[i].top, animationDelay: `${150 + i * 90}ms` }}
          >
            <div className={`hud-panel px-5 py-2.5 text-center transition hover:scale-105 ${s.alerta ? '!border-jarvis-amber/50' : ''}`}>
              <div className={`font-mono text-xl font-bold ${s.alerta ? 'glow-amber text-jarvis-amber' : 'glow-text text-jarvis-glow'}`}>{s.value}</div>
              <div className="hud-label mt-0.5">{s.label}</div>
            </div>
          </Link>
        ))}

        {/* Fundación pendiente */}
        {!summary.constitution && (
          <div className="absolute left-1/2 top-[calc(50%+190px)] z-20 -translate-x-1/2">
            <Link href="/onboarding"><Btn>◉ Fundar el Business OS</Btn></Link>
          </div>
        )}
      </div>

      {/* Accesos en grid (móvil) */}
      <div className="grid grid-cols-3 gap-2 pb-3 md:hidden">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <div className="hud-panel px-2 py-2 text-center">
              <div className="glow-text font-mono text-lg font-bold text-jarvis-glow">{s.value}</div>
              <div className="hud-label">{s.label}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Ticker de actividad ───────────────────────────────────── */}
      <div className="ticker-wrap shrink-0 border-t border-jarvis-line/60 py-2">
        <div className="ticker font-mono text-[11px] tracking-wider text-jarvis-dim">
          {[...ticker, ...ticker].map((t, i) => (
            <span key={i} className="mx-8">
              <span className="text-jarvis-cyan/60">▸</span> {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
