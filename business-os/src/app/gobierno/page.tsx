'use client'

import { useEffect, useState } from 'react'
import { api, fecha } from '@/lib/client'
import { Card, PageTitle, Badge, Btn, Input, Empty, Spinner } from '@/components/ui'

interface Entry { canal: string; evento: string; detalle: string | null; created_at: string }
interface Health { nucleo: string; checks: Array<{ nombre: string; ok: boolean; detalle: string }> }
interface Policies { email_auto: boolean; auto_ejecutar: string[]; monto_max: number | null }

const TIPOS_ACCION = ['reporte', 'documento', 'tarea', 'reunion', 'notificacion']

const CANAL_TONE: Record<string, string> = { regla: 'pendiente', cron: 'analizando' }
const EVENTO_LABEL: Record<string, string> = {
  decision: '🎯 Decisión analizada',
  accion_ejecutada: '⚡ Acción ejecutada',
  accion_rechazada: '🗑 Acción rechazada',
  email_enviado: '✉ Email enviado',
  constitucion: '§ Constitución actualizada',
  cron_creado: '⏱ Cron creado',
  cron_borrado: '⏱ Cron borrado',
  regla_creada: '🛡 Regla creada',
  regla_borrada: '🛡 Regla borrada',
  regla_disparada: '🚨 Regla disparada',
  instruccion: '🎙 Instrucción ejecutada',
  onboarding: '◉ Fundación del OS',
}

export default function GobiernoPage() {
  const [entries, setEntries] = useState<Entry[] | null>(null)
  const [filtro, setFiltro] = useState<string>('todos')
  const [health, setHealth] = useState<Health | null>(null)
  const [policies, setPoliciesState] = useState<Policies | null>(null)
  const [montoMax, setMontoMax] = useState('')
  const [polMsg, setPolMsg] = useState('')

  useEffect(() => {
    api<{ audit: Entry[] }>('/api/audit').then((r) => setEntries(r.audit)).catch(console.error)
    api<Health>('/api/health').then(setHealth).catch(console.error)
    api<{ policies: Policies }>('/api/policies').then((r) => {
      setPoliciesState(r.policies)
      setMontoMax(r.policies.monto_max ? String(r.policies.monto_max) : '')
    }).catch(console.error)
  }, [])

  async function guardarPoliticas(next: Policies) {
    setPoliciesState(next)
    setPolMsg('')
    try {
      await api('/api/policies', { method: 'PUT', json: next })
      setPolMsg('Políticas aplicadas — todos los motores las respetan desde ahora.')
    } catch (e) { setPolMsg(String(e)) }
  }

  if (!entries) return <div className="pt-16 text-center"><Spinner label="cargando registro de gobierno…" /></div>

  const canales = ['todos', ...Array.from(new Set(entries.map((e) => e.canal)))]
  const visibles = filtro === 'todos' ? entries : entries.filter((e) => e.canal === filtro)

  return (
    <div>
      <PageTitle title="Gobierno" subtitle="salud del sistema, políticas de ejecución y auditoría inmutable — nada falla en silencio, nada crítico sin tu aprobación" />

      {/* ── Salud del sistema ─────────────────────────────────────── */}
      {health && (
        <Card className="mb-6">
          <div className="mb-3 flex items-center gap-3">
            <div className="hud-label">◢ Salud del sistema</div>
            <Badge tone={health.nucleo === 'operativo' ? 'ejecutada' : health.nucleo === 'degradado' ? 'pendiente' : 'error'}>
              núcleo {health.nucleo}
            </Badge>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {health.checks.map((c) => (
              <div key={c.nombre} className="flex items-center gap-2.5 border border-jarvis-line/60 bg-black/20 px-3 py-2 [clip-path:polygon(8px_0,100%_0,100%_calc(100%-8px),calc(100%-8px)_100%,0_100%,0_8px)]">
                <span className={`h-2 w-2 shrink-0 rounded-full ${c.ok ? 'animate-pulse bg-jarvis-cyan' : 'bg-jarvis-amber'}`} />
                <span className="font-mono text-xs text-jarvis-text/85">{c.nombre}</span>
                <span className="ml-auto truncate font-mono text-[10px] text-jarvis-dim">{c.detalle}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Políticas de ejecución ────────────────────────────────── */}
      {policies && (
        <Card className="mb-6" delay={80}>
          <div className="hud-label mb-3">◢ Políticas de ejecución // qué puede hacer el OS sin ti</div>
          <div className="space-y-3">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={policies.email_auto}
                onChange={(e) => guardarPoliticas({ ...policies, email_auto: e.target.checked })}
                className="h-4 w-4 accent-cyan-400"
              />
              <span className="font-mono text-sm text-jarvis-text/85">✉ Enviar emails automáticamente si hay destinatario claro</span>
              <span className="font-mono text-[10px] text-jarvis-dim">(apagado = siempre a la cola de aprobación)</span>
            </label>

            <div>
              <div className="mb-1.5 font-mono text-sm text-jarvis-text/85">⚡ Acciones sugeridas que se ejecutan solas (el resto pasa por tu aprobación):</div>
              <div className="flex flex-wrap gap-2">
                {TIPOS_ACCION.map((t) => {
                  const on = policies.auto_ejecutar.includes(t)
                  return (
                    <button
                      key={t}
                      onClick={() => guardarPoliticas({ ...policies, auto_ejecutar: on ? policies.auto_ejecutar.filter((x) => x !== t) : [...policies.auto_ejecutar, t] })}
                      className={`border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] transition [clip-path:polygon(6px_0,100%_0,100%_calc(100%-6px),calc(100%-6px)_100%,0_100%,0_6px)] ${
                        on ? 'glow-text border-jarvis-cyan/60 bg-jarvis-cyan/15 text-jarvis-glow' : 'border-jarvis-line text-jarvis-dim hover:text-jarvis-text'
                      }`}
                    >
                      {on ? '✓ ' : ''}{t}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm text-jarvis-text/85">💵 Monto máximo sin aprobación: $</span>
              <Input className="w-28" placeholder="sin límite" value={montoMax} onChange={(e) => setMontoMax(e.target.value)} />
              <Btn variant="ghost" onClick={() => guardarPoliticas({ ...policies, monto_max: Number(montoMax) > 0 ? Number(montoMax) : null })}>Aplicar</Btn>
              <span className="font-mono text-[10px] text-jarvis-dim">toda acción/decisión que supere este monto exige tu aprobación explícita</span>
            </div>
            {polMsg && <p className="glow-text font-mono text-xs text-jarvis-cyan">{polMsg}</p>}
          </div>
        </Card>
      )}

      <div className="hud-label mb-3">◢ Auditoría</div>
      <div className="mb-4 flex animate-materialize flex-wrap gap-2">
        {canales.map((c) => (
          <button
            key={c}
            onClick={() => setFiltro(c)}
            className={`border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.25em] transition [clip-path:polygon(6px_0,100%_0,100%_calc(100%-6px),calc(100%-6px)_100%,0_100%,0_6px)] ${
              filtro === c ? 'glow-text border-jarvis-cyan/60 bg-jarvis-cyan/15 text-jarvis-glow' : 'border-jarvis-line text-jarvis-dim hover:text-jarvis-text'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {visibles.length === 0 && <Empty>REGISTRO VACÍO — las operaciones sensibles (decisiones, acciones, emails, crons, reglas) quedarán auditadas aquí</Empty>}

      <Card>
        <div className="space-y-2">
          {visibles.map((e, i) => (
            <div key={i} className="flex animate-materialize items-start gap-3 border-b border-jarvis-line/40 pb-2 last:border-0" style={{ animationDelay: `${Math.min(i, 15) * 30}ms` }}>
              <span className="w-36 shrink-0 pt-0.5 font-mono text-[10px] text-jarvis-dim">{fecha(e.created_at)}</span>
              <Badge tone={CANAL_TONE[e.canal]}>{e.canal}</Badge>
              <div className="min-w-0 flex-1">
                <div className="text-sm text-jarvis-text/90">{EVENTO_LABEL[e.evento] ?? e.evento}</div>
                {e.detalle && <div className="truncate font-mono text-[11px] text-jarvis-dim">{e.detalle}</div>}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
