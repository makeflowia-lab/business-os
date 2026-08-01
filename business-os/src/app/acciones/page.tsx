'use client'

import { useCallback, useEffect, useState } from 'react'
import { api, fecha } from '@/lib/client'
import { Card, PageTitle, Btn, Input, Textarea, Select, Badge, Empty, Spinner } from '@/components/ui'

interface Action {
  id: string; tipo: string; titulo: string; detalle: string | null
  estado: string; resultado: string | null; origen: string; created_at: string
}

const TIPOS = ['email', 'reunion', 'tarea', 'documento', 'reporte', 'notificacion', 'otro']
const ICON: Record<string, string> = { email: '✉', reunion: '◷', tarea: '✓', documento: '▤', reporte: '▥', notificacion: '◉', otro: '⚡' }

export default function AccionesPage() {
  const [actions, setActions] = useState<Action[]>([])
  const [form, setForm] = useState({ tipo: 'tarea', titulo: '', detalle: '' })
  const [running, setRunning] = useState<string | null>(null)
  const [abierta, setAbierta] = useState<string | null>(null)

  const load = useCallback(() => api<{ actions: Action[] }>('/api/actions').then((r) => setActions(r.actions)), [])
  useEffect(() => { load().catch(console.error) }, [load])

  async function crear() {
    await api('/api/actions', { method: 'POST', json: form })
    setForm({ ...form, titulo: '', detalle: '' })
    await load()
  }

  async function operar(id: string, op: 'ejecutar' | 'rechazar') {
    if (op === 'ejecutar') setRunning(id)
    try {
      await api(`/api/actions/${id}`, { method: 'PATCH', json: { op } })
      await load()
      if (op === 'ejecutar') setAbierta(id)
    } catch { await load() } finally { setRunning(null) }
  }

  const pendientes = actions.filter((a) => a.estado === 'pendiente')
  const resto = actions.filter((a) => a.estado !== 'pendiente')

  function renderAction(a: Action, i: number) {
    const open = abierta === a.id
    return (
      <Card key={a.id} delay={i * 50}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-jarvis-cyan">{ICON[a.tipo] ?? '⚡'}</span>
          <span className="font-title text-sm font-semibold text-jarvis-text">{a.titulo}</span>
          <Badge tone={a.estado}>{a.estado}</Badge>
          <Badge>{a.origen}</Badge>
          <span className="ml-auto font-mono text-[10px] text-jarvis-dim">{fecha(a.created_at)}</span>
        </div>
        {a.detalle && <p className="mt-1.5 text-sm text-jarvis-text/70">{a.detalle}</p>}

        <div className="mt-3 flex items-center gap-2">
          {a.estado === 'pendiente' && (
            <>
              <Btn disabled={running !== null} onClick={() => operar(a.id, 'ejecutar')}>
                {running === a.id ? 'Ejecutando…' : '▶ Ejecutar'}
              </Btn>
              <Btn variant="danger" disabled={running !== null} onClick={() => operar(a.id, 'rechazar')}>Rechazar</Btn>
              {running === a.id && <Spinner label="el Automation Engine está produciendo el entregable…" />}
            </>
          )}
          {a.resultado && (
            <Btn variant="ghost" onClick={() => setAbierta(open ? null : a.id)}>
              {open ? 'Ocultar resultado' : 'Ver resultado'}
            </Btn>
          )}
        </div>

        {open && a.resultado && (
          <div className="mt-3 animate-materialize border border-jarvis-line/60 bg-black/40 p-4">
            <div className="hud-label mb-2">◢ Entregable</div>
            <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-jarvis-text/85">{a.resultado}</pre>
          </div>
        )}
      </Card>
    )
  }

  return (
    <div>
      <PageTitle title="Automation Engine" subtitle="cola de acciones: el sistema propone, tú apruebas, el motor ejecuta. emails, reportes, briefs, convocatorias…" />

      <Card className="mb-6">
        <div className="hud-label mb-3">◢ Encolar acción manual</div>
        <div className="flex flex-wrap gap-2">
          <Select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
            {TIPOS.map((t) => <option key={t} value={t}>{ICON[t]} {t}</option>)}
          </Select>
          <Input className="flex-1" placeholder="Título de la acción" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
          <Btn disabled={!form.titulo.trim()} onClick={crear}>Encolar</Btn>
        </div>
        <Textarea className="mt-2" rows={2} placeholder="Detalle (a quién, sobre qué, con qué objetivo…)" value={form.detalle} onChange={(e) => setForm({ ...form, detalle: e.target.value })} />
      </Card>

      <div className="hud-label mb-3">◢ Pendientes de aprobación // {pendientes.length}</div>
      {pendientes.length === 0 && <Empty>NADA PENDIENTE — las decisiones y los agentes encolarán acciones aquí</Empty>}
      <div className="space-y-3">{pendientes.map(renderAction)}</div>

      {resto.length > 0 && (
        <>
          <div className="hud-label mb-3 mt-8">◢ Historial</div>
          <div className="space-y-3">{resto.map(renderAction)}</div>
        </>
      )}
    </div>
  )
}
