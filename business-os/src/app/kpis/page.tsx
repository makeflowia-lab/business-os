'use client'

import { useCallback, useEffect, useState } from 'react'
import { api, fecha } from '@/lib/client'
import { Card, PageTitle, Btn, Input, Select, Empty, Ring, Spinner } from '@/components/ui'

interface Kpi {
  id: string; nombre: string; unidad: string | null; objetivo: string | null; direccion: string
  ultimo_valor: string | null; ultima_fecha: string | null
  historia: Array<{ valor: string; fecha: string }> | null
}

function kpiPct(k: Kpi): number | null {
  const v = Number(k.ultimo_valor), o = Number(k.objetivo)
  if (!k.ultimo_valor || !k.objetivo || isNaN(v) || isNaN(o) || o === 0) return null
  return k.direccion === 'bajar' ? (v <= 0 ? 100 : (o / v) * 100) : (v / o) * 100
}

function Sparkline({ historia }: { historia: Kpi['historia'] }) {
  if (!historia || historia.length < 2) return null
  const vals = historia.map((h) => Number(h.valor))
  const min = Math.min(...vals), max = Math.max(...vals)
  const range = max - min || 1
  const W = 120, H = 28
  const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * W},${H - 3 - ((v - min) / range) * (H - 6)}`).join(' ')
  return (
    <svg width={W} height={H} className="shrink-0 opacity-80">
      <polyline points={pts} fill="none" stroke="#22d3ee" strokeWidth="1.5" style={{ filter: 'drop-shadow(0 0 3px rgba(34,211,238,0.5))' }} />
    </svg>
  )
}

export default function KpisPage() {
  const [kpis, setKpis] = useState<Kpi[] | null>(null)
  const [nuevo, setNuevo] = useState({ nombre: '', unidad: '', objetivo: '', direccion: 'subir' })
  const [valores, setValores] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => api<{ kpis: Kpi[] }>('/api/kpis').then((r) => setKpis(r.kpis)), [])
  useEffect(() => { load().catch(console.error) }, [load])

  async function crear() {
    if (!nuevo.nombre.trim()) return
    setBusy(true)
    try {
      await api('/api/kpis', { method: 'POST', json: { ...nuevo, objetivo: nuevo.objetivo || null } })
      setNuevo({ nombre: '', unidad: '', objetivo: '', direccion: 'subir' })
      await load()
    } finally { setBusy(false) }
  }

  async function registrar(kpiId: string) {
    const valor = valores[kpiId]
    if (!valor) return
    setBusy(true)
    try {
      await api('/api/kpis', { method: 'PUT', json: { kpiId, valor } })
      setValores((v) => ({ ...v, [kpiId]: '' }))
      await load()
    } finally { setBusy(false) }
  }

  async function borrar(id: string) {
    await api(`/api/kpis?id=${id}`, { method: 'DELETE' })
    await load()
  }

  if (!kpis) return <div className="pt-16 text-center"><Spinner label="cargando telemetría…" /></div>

  return (
    <div>
      <PageTitle title="Telemetría" subtitle="los signos vitales de la empresa — el núcleo los usa en cada decisión y el Centinela los vigila por umbral" />

      <Card className="mb-6">
        <div className="hud-label mb-3">◢ Nuevo KPI</div>
        <div className="flex flex-wrap gap-2">
          <Input className="w-40 flex-1" placeholder="Nombre (ej. MRR)" value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} />
          <Input className="w-24" placeholder="unidad" value={nuevo.unidad} onChange={(e) => setNuevo({ ...nuevo, unidad: e.target.value })} />
          <Input className="w-28" placeholder="objetivo" value={nuevo.objetivo} onChange={(e) => setNuevo({ ...nuevo, objetivo: e.target.value })} />
          <Select value={nuevo.direccion} onChange={(e) => setNuevo({ ...nuevo, direccion: e.target.value })}>
            <option value="subir">↑ subir</option>
            <option value="bajar">↓ bajar</option>
          </Select>
          <Btn disabled={busy || !nuevo.nombre.trim()} onClick={crear}>Crear</Btn>
        </div>
        <p className="mt-2 font-mono text-[11px] text-jarvis-dim">también por voz: &quot;registra ventas de hoy 4500&quot; — JARVIS o Telegram</p>
      </Card>

      {kpis.length === 0 && <Empty>SIN TELEMETRÍA — crea tu primer KPI; sin signos vitales el núcleo decide a ciegas</Empty>}

      <div className="grid gap-4 md:grid-cols-2">
        {kpis.map((k, i) => (
          <Card key={k.id} delay={i * 60}>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Ring
                  pct={kpiPct(k)}
                  size={72}
                  label={k.nombre}
                  sub={`${k.ultimo_valor ?? 'sin dato'}${k.unidad ? ` ${k.unidad}` : ''}${k.objetivo ? ` / obj ${k.objetivo} (${k.direccion === 'bajar' ? '↓' : '↑'})` : ''}${k.ultima_fecha ? ` · ${fecha(k.ultima_fecha)}` : ''}`}
                />
              </div>
              <Sparkline historia={k.historia} />
            </div>
            <div className="mt-3 flex items-center gap-2 border-t border-jarvis-line/50 pt-3">
              <Input
                className="w-28"
                placeholder="nuevo valor"
                value={valores[k.id] ?? ''}
                onChange={(e) => setValores((v) => ({ ...v, [k.id]: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && registrar(k.id)}
              />
              <Btn variant="ghost" disabled={busy || !valores[k.id]} onClick={() => registrar(k.id)}>＋ Registrar</Btn>
              <button className="ml-auto font-mono text-xs text-jarvis-dim transition hover:text-red-400" onClick={() => borrar(k.id)}>✕</button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
