'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/client'
import { Card, PageTitle, Btn, Input, Spinner, Badge } from '@/components/ui'

interface QA { q: string; a: string }
interface Propuesta {
  empresa: string; resumen: string; constitucion_md: string
  entidades: Array<{ tipo: string; nombre: string; descripcion: string }>
  kpis: Array<{ nombre: string; unidad: string; objetivo: number | null; direccion: string; valor_actual: number | null }>
  crons: Array<{ nombre: string; cron: string; instruccion: string }>
}
type Step = { done: false; pregunta: string; progreso: number } | { done: true; propuesta: Propuesta }

export default function OnboardingPage() {
  const router = useRouter()
  const [historial, setHistorial] = useState<QA[]>([])
  const [pregunta, setPregunta] = useState('')
  const [progreso, setProgreso] = useState(0)
  const [respuesta, setRespuesta] = useState('')
  const [pensando, setPensando] = useState(false)
  const [propuesta, setPropuesta] = useState<Propuesta | null>(null)
  const [aplicando, setAplicando] = useState(false)
  const [error, setError] = useState('')
  const iniciado = useRef(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  async function paso(nuevoHistorial: QA[]) {
    setPensando(true)
    setError('')
    try {
      const r = await api<Step>('/api/onboarding', { method: 'POST', json: { historial: nuevoHistorial } })
      if (r.done) {
        setPropuesta(r.propuesta)
        setProgreso(100)
      } else {
        setPregunta(r.pregunta)
        setProgreso(r.progreso ?? Math.min(95, nuevoHistorial.length * 13))
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setPensando(false)
    }
  }

  useEffect(() => {
    if (iniciado.current) return
    iniciado.current = true
    paso([])
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [historial, pregunta, pensando, propuesta])

  async function responder() {
    if (!respuesta.trim() || pensando || !pregunta) return
    const nuevo = [...historial, { q: pregunta, a: respuesta.trim() }]
    setHistorial(nuevo)
    setRespuesta('')
    setPregunta('')
    await paso(nuevo)
  }

  async function fundar() {
    if (!propuesta) return
    setAplicando(true)
    setError('')
    try {
      await api('/api/onboarding/apply', { method: 'POST', json: { propuesta } })
      router.push('/')
    } catch (e) {
      setError(String(e))
      setAplicando(false)
    }
  }

  return (
    <div>
      <PageTitle title="Onboarding Ingestor" subtitle="el Business OS te entrevista y construye solo el gemelo digital de tu empresa: constitución, entidades, KPIs y automatizaciones" />

      {/* Barra de progreso */}
      <div className="mb-6 animate-materialize">
        <div className="mb-1 flex justify-between font-mono text-[10px] tracking-[0.25em] text-jarvis-dim">
          <span>CONSTRUCCIÓN DEL GEMELO DIGITAL</span>
          <span className="glow-text text-jarvis-cyan">{progreso}%</span>
        </div>
        <div className="h-1 w-full bg-jarvis-line/50">
          <div className="h-1 bg-jarvis-cyan shadow-[0_0_10px_#22d3ee] transition-all duration-700" style={{ width: `${progreso}%` }} />
        </div>
      </div>

      {!propuesta && (
        <Card>
          <div className="max-h-[45vh] space-y-3 overflow-y-auto pr-2">
            {historial.map((h, i) => (
              <div key={i} className="space-y-2">
                <div className="max-w-[85%] border border-jarvis-line/60 bg-black/30 px-4 py-2.5 text-sm text-jarvis-text/85 [clip-path:polygon(0_0,100%_0,100%_calc(100%-10px),calc(100%-10px)_100%,0_100%)]">
                  <span className="glow-text font-mono text-[10px] uppercase tracking-widest text-jarvis-cyan">B.OS ▸ </span>{h.q}
                </div>
                <div className="ml-auto max-w-[85%] border border-jarvis-cyan/30 bg-jarvis-cyan/10 px-4 py-2.5 text-sm text-jarvis-text [clip-path:polygon(10px_0,100%_0,100%_100%,0_100%,0_10px)]">
                  {h.a}
                </div>
              </div>
            ))}
            {pregunta && (
              <div className="max-w-[85%] animate-materialize border border-jarvis-line/60 bg-black/30 px-4 py-2.5 text-sm text-jarvis-text/85 [clip-path:polygon(0_0,100%_0,100%_calc(100%-10px),calc(100%-10px)_100%,0_100%)]">
                <span className="glow-text font-mono text-[10px] uppercase tracking-widest text-jarvis-cyan">B.OS ▸ </span>{pregunta}
              </div>
            )}
            {pensando && <Spinner label={historial.length === 0 ? 'iniciando entrevista…' : 'procesando tu respuesta…'} />}
            <div ref={bottomRef} />
          </div>

          <div className="mt-4 flex gap-2 border-t border-jarvis-line/60 pt-4">
            <Input
              placeholder="Tu respuesta… (escribe 'listo' si quieres terminar antes)"
              value={respuesta}
              onChange={(e) => setRespuesta(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && responder()}
              disabled={pensando || !pregunta}
            />
            <Btn disabled={pensando || !respuesta.trim() || !pregunta} onClick={responder}>Responder</Btn>
          </div>
          {error && <p className="mt-3 font-mono text-xs text-red-400">{error}</p>}
        </Card>
      )}

      {propuesta && (
        <div className="space-y-4">
          <Card>
            <div className="hud-label mb-2">◢ Propuesta de fundación // {propuesta.empresa}</div>
            <p className="text-sm leading-relaxed text-jarvis-text/85">{propuesta.resumen}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge>{propuesta.entidades?.length ?? 0} entidades</Badge>
              <Badge>{propuesta.kpis?.length ?? 0} KPIs</Badge>
              <Badge>{propuesta.crons?.length ?? 0} automatizaciones</Badge>
              <Badge>constitución incluida</Badge>
            </div>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Card delay={80}>
              <div className="hud-label mb-2">◢ Entidades</div>
              <div className="max-h-56 space-y-1.5 overflow-y-auto font-mono text-xs text-jarvis-text/80">
                {propuesta.entidades?.map((e, i) => <div key={i}>▸ [{e.tipo}] {e.nombre}</div>)}
              </div>
            </Card>
            <Card delay={140}>
              <div className="hud-label mb-2">◢ KPIs</div>
              <div className="max-h-56 space-y-1.5 overflow-y-auto font-mono text-xs text-jarvis-text/80">
                {propuesta.kpis?.map((k, i) => (
                  <div key={i}>▸ {k.nombre}: {k.valor_actual ?? '—'}{k.unidad ? ` ${k.unidad}` : ''}{k.objetivo ? ` (obj ${k.objetivo})` : ''}</div>
                ))}
              </div>
            </Card>
            <Card delay={200}>
              <div className="hud-label mb-2">◢ Automatizaciones</div>
              <div className="max-h-56 space-y-1.5 overflow-y-auto font-mono text-xs text-jarvis-text/80">
                {propuesta.crons?.map((c, i) => <div key={i}>▸ {c.nombre} ({c.cron})</div>)}
              </div>
            </Card>
          </div>

          <Card delay={260}>
            <div className="hud-label mb-2">◢ Constitución Empresarial (borrador)</div>
            <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-jarvis-text/75">{propuesta.constitucion_md}</pre>
          </Card>

          <div className="flex items-center gap-3">
            <Btn onClick={fundar} disabled={aplicando}>{aplicando ? 'Fundando…' : '◉ Fundar el Business OS'}</Btn>
            <Btn variant="ghost" disabled={aplicando} onClick={() => { setPropuesta(null); setPregunta('¿Qué quieres corregir o agregar antes de fundar?'); setProgreso(90) }}>
              Corregir algo
            </Btn>
            {aplicando && <Spinner label="creando constitución, entidades, KPIs y automatizaciones…" />}
          </div>
          {error && <p className="font-mono text-xs text-red-400">{error}</p>}
        </div>
      )}
    </div>
  )
}
