'use client'

import { useCallback, useEffect, useState } from 'react'
import { api, fecha } from '@/lib/client'
import { Card, PageTitle, Btn, Textarea, Badge, Empty, Spinner } from '@/components/ui'

interface Analisis {
  resumen: string
  lentes: Array<{ lente: string; analisis: string; datos_usados: string[]; datos_faltantes: string[] }>
  riesgos: string[]
  oportunidades: string[]
  recomendacion: string
  condiciones: string[]
  confianza: number
  acciones_sugeridas: Array<{ tipo: string; titulo: string; detalle: string }>
}

interface Decision { id: string; pregunta: string; estado: string; analisis: Analisis | { error?: string } | null; created_at: string }

export default function DecisionesPage() {
  const [decisions, setDecisions] = useState<Decision[]>([])
  const [pregunta, setPregunta] = useState('')
  const [analizando, setAnalizando] = useState(false)
  const [error, setError] = useState('')
  const [abierta, setAbierta] = useState<string | null>(null)

  const load = useCallback(() => api<{ decisions: Decision[] }>('/api/decisions').then((r) => setDecisions(r.decisions)), [])
  useEffect(() => { load().catch(console.error) }, [load])

  async function analizar() {
    if (!pregunta.trim()) return
    setAnalizando(true)
    setError('')
    try {
      const r = await api<{ id: string }>('/api/decisions', { method: 'POST', json: { pregunta } })
      setPregunta('')
      await load()
      setAbierta(r.id)
    } catch (e) {
      setError(String(e))
      await load()
    } finally { setAnalizando(false) }
  }

  return (
    <div>
      <PageTitle title="Decision Engine" subtitle="no responde: piensa. analiza ventas, caja, capacidad, riesgos e historial antes de recomendar" />

      <Card className="mb-6">
        <div className="hud-label mb-3">◢ Nueva decisión estratégica</div>
        <Textarea
          rows={3}
          placeholder='Plantea una decisión… ej. "¿Contratamos tres vendedores?" o "¿Subimos el precio del plan Pro 20%?"'
          value={pregunta}
          onChange={(e) => setPregunta(e.target.value)}
        />
        <div className="mt-3 flex items-center gap-3">
          <Btn disabled={analizando || !pregunta.trim()} onClick={analizar}>
            {analizando ? 'Analizando…' : '◎ Analizar decisión'}
          </Btn>
          {analizando && <Spinner label="pasando la decisión por todas las lentes de la empresa… (1-3 min)" />}
        </div>
        {error && <p className="mt-3 font-mono text-xs text-red-400">{error}</p>}
      </Card>

      {decisions.length === 0 && <Empty>SIN DECISIONES — la primera pregunta estratégica funda el historial de tu empresa</Empty>}

      <div className="space-y-4">
        {decisions.map((d, di) => {
          const a = d.analisis as Analisis | null
          const ok = d.estado === 'completada' && a && 'recomendacion' in a
          const open = abierta === d.id
          return (
            <Card key={d.id} delay={di * 60} className="cursor-pointer">
              <div onClick={() => setAbierta(open ? null : d.id)}>
                <div className="flex items-center gap-2">
                  <Badge tone={d.estado}>{d.estado}</Badge>
                  {ok && <span className="font-mono text-[10px] tracking-widest text-jarvis-cyan">CONF {a.confianza}%</span>}
                  <span className="ml-auto font-mono text-[10px] text-jarvis-dim">{fecha(d.created_at)}</span>
                  <span className="text-jarvis-cyan">{open ? '▾' : '▸'}</span>
                </div>
                <div className="mt-2 font-title text-base font-semibold text-jarvis-text">{d.pregunta}</div>
                {ok && !open && <div className="mt-1 line-clamp-2 text-sm text-jarvis-text/60">{a.recomendacion}</div>}
              </div>

              {open && ok && (
                <div className="mt-4 space-y-4 border-t border-jarvis-line/60 pt-4">
                  <p className="text-sm leading-relaxed text-jarvis-text/85">{a.resumen}</p>

                  <div className="grid gap-3 md:grid-cols-2">
                    {a.lentes?.map((l, i) => (
                      <div key={i} className="animate-materialize border border-jarvis-line/60 bg-black/20 p-3" style={{ animationDelay: `${i * 70}ms` }}>
                        <div className="glow-text font-mono text-[10px] uppercase tracking-[0.25em] text-jarvis-glow">▸ {l.lente}</div>
                        <p className="mt-1.5 text-sm leading-relaxed text-jarvis-text/80">{l.analisis}</p>
                        {l.datos_faltantes?.length > 0 && (
                          <p className="glow-amber mt-2 font-mono text-[10px] text-jarvis-amber">⚠ FALTAN: {l.datos_faltantes.join('; ')}</p>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {a.riesgos?.length > 0 && (
                      <div>
                        <div className="glow-amber mb-1.5 font-mono text-[10px] uppercase tracking-[0.25em] text-jarvis-amber">⚠ Riesgos</div>
                        <ul className="list-disc space-y-1 pl-5 text-sm text-jarvis-text/80">{a.riesgos.map((r, i) => <li key={i}>{r}</li>)}</ul>
                      </div>
                    )}
                    {a.oportunidades?.length > 0 && (
                      <div>
                        <div className="glow-text mb-1.5 font-mono text-[10px] uppercase tracking-[0.25em] text-jarvis-glow">◆ Oportunidades</div>
                        <ul className="list-disc space-y-1 pl-5 text-sm text-jarvis-text/80">{a.oportunidades.map((o, i) => <li key={i}>{o}</li>)}</ul>
                      </div>
                    )}
                  </div>

                  <div className="border border-jarvis-cyan/35 bg-jarvis-cyan/5 p-4 shadow-[inset_0_0_24px_rgba(34,211,238,0.05)] [clip-path:polygon(12px_0,100%_0,100%_calc(100%-12px),calc(100%-12px)_100%,0_100%,0_12px)]">
                    <div className="glow-text mb-1.5 font-mono text-[10px] uppercase tracking-[0.3em] text-jarvis-cyan">✓ Recomendación</div>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-jarvis-text">{a.recomendacion}</p>
                    {a.condiciones?.length > 0 && (
                      <p className="mt-2 font-mono text-[11px] text-jarvis-dim">CAMBIA SI: {a.condiciones.join(' · ')}</p>
                    )}
                  </div>

                  {a.acciones_sugeridas?.length > 0 && (
                    <p className="font-mono text-xs text-jarvis-dim">
                      ⚡ {a.acciones_sugeridas.length} acción(es) sugerida(s) encolada(s) en <a href="/acciones" className="text-jarvis-cyan hover:text-jarvis-glow">Acciones</a>
                    </p>
                  )}
                </div>
              )}

              {open && d.estado === 'error' && (
                <p className="mt-3 font-mono text-xs text-red-400">{(d.analisis as { error?: string })?.error ?? 'Error desconocido'}</p>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
