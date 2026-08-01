'use client'

import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/client'
import { Card, PageTitle, Btn, Input, Empty, Spinner } from '@/components/ui'

interface Roi {
  dias: number; valorHora: number; totalHoras: number; totalValor: number
  desglose: Array<{ concepto: string; cantidad: number; horas: number }>
}

export default function RoiPage() {
  const [roi, setRoi] = useState<Roi | null>(null)
  const [dias, setDias] = useState(30)
  const [valorHora, setValorHora] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback((d: number) =>
    api<{ roi: Roi }>(`/api/roi?dias=${d}`).then((r) => { setRoi(r.roi); setValorHora(String(r.roi.valorHora)) }), [])
  useEffect(() => { load(dias).catch(console.error) }, [dias, load])

  async function guardarValorHora() {
    const v = Number(valorHora)
    if (isNaN(v) || v <= 0) return
    setBusy(true)
    try {
      await api('/api/roi', { method: 'PUT', json: { valorHora: v } })
      await load(dias)
    } finally { setBusy(false) }
  }

  if (!roi) return <div className="pt-16 text-center"><Spinner label="calculando retorno…" /></div>

  const maxHoras = Math.max(...roi.desglose.map((d) => d.horas), 1)

  return (
    <div>
      <PageTitle title="Retorno del Sistema" subtitle="horas y dinero que el Business OS le devuelve a la empresa — estimaciones conservadoras y declaradas, no promesas" >
        <div className="flex gap-2">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDias(d)}
              className={`border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] transition [clip-path:polygon(6px_0,100%_0,100%_calc(100%-6px),calc(100%-6px)_100%,0_100%,0_6px)] ${
                dias === d ? 'glow-text border-jarvis-cyan/60 bg-jarvis-cyan/15 text-jarvis-glow' : 'border-jarvis-line text-jarvis-dim hover:text-jarvis-text'
              }`}
            >
              {d} días
            </button>
          ))}
        </div>
      </PageTitle>

      {/* Números grandes */}
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card className="text-center">
          <div className="hud-label mb-1">⏱ Horas recuperadas</div>
          <div className="glow-text font-mono text-4xl font-bold text-jarvis-glow">{roi.totalHoras}<span className="text-lg text-jarvis-dim"> h</span></div>
        </Card>
        <Card delay={80} className="text-center">
          <div className="hud-label mb-1">💵 Valor estimado</div>
          <div className="glow-text font-mono text-4xl font-bold text-jarvis-glow">${roi.totalValor.toLocaleString()}</div>
        </Card>
        <Card delay={160} className="text-center">
          <div className="hud-label mb-2">Tu valor-hora</div>
          <div className="flex items-center justify-center gap-2">
            <span className="font-mono text-jarvis-dim">$</span>
            <Input className="w-24 text-center" value={valorHora} onChange={(e) => setValorHora(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && guardarValorHora()} />
            <Btn variant="ghost" disabled={busy} onClick={guardarValorHora}>OK</Btn>
          </div>
          <p className="mt-1 font-mono text-[10px] text-jarvis-dim">cuánto vale una hora tuya/de tu equipo</p>
        </Card>
      </div>

      {/* Desglose */}
      <Card delay={220}>
        <div className="hud-label mb-4">◢ Desglose // últimos {roi.dias} días</div>
        {roi.desglose.length === 0 && (
          <Empty>SIN OPERACIONES EN EL PERÍODO — cada decisión, acción, email y automatización suma aquí</Empty>
        )}
        <div className="space-y-3">
          {roi.desglose.map((d, i) => (
            <div key={i} className="animate-materialize" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="mb-1 flex items-center justify-between font-mono text-sm">
                <span className="text-jarvis-text/85">{d.concepto} <span className="text-jarvis-dim">× {d.cantidad}</span></span>
                <span className="glow-text text-jarvis-glow">~{d.horas} h</span>
              </div>
              <div className="h-1.5 w-full bg-jarvis-line/40">
                <div className="h-1.5 bg-jarvis-cyan shadow-[0_0_8px_rgba(34,211,238,0.5)] transition-all duration-700" style={{ width: `${(d.horas / maxHoras) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-5 border-t border-jarvis-line/50 pt-3 font-mono text-[11px] leading-relaxed text-jarvis-dim">
          Horas estimadas por operación: email 0.4h · reunión 0.3h · tarea 0.5h · documento 1h · reporte 1.5h ·
          decisión 2h · simulación 2.5h · consulta a agente 0.15h · cron 0.5h. Pide el reporte por chat:
          <span className="text-jarvis-cyan"> &quot;¿cuánto me has ahorrado este mes?&quot;</span>
        </p>
      </Card>
    </div>
  )
}
