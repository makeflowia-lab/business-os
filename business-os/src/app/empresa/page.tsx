'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@/lib/client'
import { Card, PageTitle, Btn, Input, Select, Empty } from '@/components/ui'

interface Entity { id: string; tipo: string; nombre: string; descripcion: string | null }
interface GraphEdge { id: string; origen_id: string; destino_id: string; origen: string; destino: string; relacion: string }

const TIPOS = ['persona', 'cliente', 'producto', 'proveedor', 'proyecto', 'proceso', 'contrato', 'activo', 'otro']
const ICON: Record<string, string> = {
  persona: '◈', cliente: '◇', producto: '▣', proveedor: '⬢', proyecto: '▲',
  proceso: '↻', contrato: '§', activo: '⬟', otro: '·',
}

function GraphView({ edges, entities }: { edges: GraphEdge[]; entities: Entity[] }) {
  // Nodos que participan en relaciones, en disposición circular
  const ids = Array.from(new Set(edges.flatMap((e) => [e.origen_id, e.destino_id]))).slice(0, 24)
  if (ids.length < 2) return null
  const W = 640, H = 380, cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2 - 56
  const pos = new Map(ids.map((id, i) => {
    const a = (i / ids.length) * Math.PI * 2 - Math.PI / 2
    return [id, { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) }]
  }))
  const nameOf = (id: string) => entities.find((e) => e.id === id)?.nombre ?? '?'

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {edges.filter((e) => pos.has(e.origen_id) && pos.has(e.destino_id)).map((e) => {
        const a = pos.get(e.origen_id)!, b = pos.get(e.destino_id)!
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2
        return (
          <g key={e.id}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="rgba(34,211,238,0.3)" strokeWidth="1" />
            <text x={mx} y={my - 3} textAnchor="middle" className="fill-jarvis-dim" style={{ fontSize: 8, fontFamily: 'var(--font-mono)' }}>
              {e.relacion}
            </text>
          </g>
        )
      })}
      {ids.map((id) => {
        const p = pos.get(id)!
        return (
          <g key={id}>
            <circle cx={p.x} cy={p.y} r="4" fill="#22d3ee" style={{ filter: 'drop-shadow(0 0 5px rgba(34,211,238,0.8))' }} />
            <circle cx={p.x} cy={p.y} r="8" fill="none" stroke="rgba(34,211,238,0.3)" strokeWidth="1" />
            <text x={p.x} y={p.y + (p.y > cy ? 22 : -14)} textAnchor="middle" className="fill-jarvis-text" style={{ fontSize: 10, fontFamily: 'var(--font-mono)' }}>
              {nameOf(id).slice(0, 18)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export default function EmpresaPage() {
  const [entities, setEntities] = useState<Entity[]>([])
  const [edges, setEdges] = useState<GraphEdge[]>([])
  const [form, setForm] = useState({ tipo: 'cliente', nombre: '', descripcion: '' })
  const [linkForm, setLinkForm] = useState({ origen: '', relacion: '', destino: '' })
  const [busy, setBusy] = useState(false)
  const [csvMsg, setCsvMsg] = useState('')
  const csvRef = useRef<HTMLInputElement>(null)

  const load = useCallback(() => Promise.all([
    api<{ entities: Entity[] }>('/api/entities').then((r) => setEntities(r.entities)),
    api<{ edges: GraphEdge[] }>('/api/graph').then((r) => setEdges(r.edges)),
  ]), [])
  useEffect(() => { load().catch(console.error) }, [load])

  async function conectar() {
    if (!linkForm.origen || !linkForm.relacion.trim() || !linkForm.destino) return
    setBusy(true)
    try {
      const origen = entities.find((e) => e.id === linkForm.origen)
      const destino = entities.find((e) => e.id === linkForm.destino)
      await api('/api/graph', { method: 'POST', json: { origen: origen?.nombre, relacion: linkForm.relacion, destino: destino?.nombre } })
      setLinkForm({ origen: '', relacion: '', destino: '' })
      await load()
    } finally { setBusy(false) }
  }

  async function desconectar(id: string) {
    await api(`/api/graph?id=${id}`, { method: 'DELETE' })
    await load()
  }

  /** Importa un CSV: detecta la columna de nombre y usa el resto como descripción. */
  async function importarCSV(file: File) {
    setCsvMsg('')
    const text = await file.text()
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    if (lines.length < 2) { setCsvMsg('El CSV necesita encabezado + al menos una fila.'); return }

    const sep = lines[0].includes(';') ? ';' : ','
    const headers = lines[0].split(sep).map((h) => h.trim().toLowerCase().replace(/"/g, ''))
    let idxNombre = headers.findIndex((h) => ['nombre', 'name', 'cliente', 'razon social', 'razón social', 'empresa'].includes(h))
    if (idxNombre === -1) idxNombre = 0

    const entidades = lines.slice(1).map((line) => {
      const cols = line.split(sep).map((c) => c.trim().replace(/^"|"$/g, ''))
      const nombre = cols[idxNombre]
      const resto = cols.filter((_, i) => i !== idxNombre).filter(Boolean).join(' · ')
      return { tipo: form.tipo, nombre, descripcion: resto.slice(0, 300) }
    }).filter((e) => e.nombre)

    if (!entidades.length) { setCsvMsg('No encontré nombres válidos en el CSV.'); return }
    setBusy(true)
    try {
      const r = await api<{ creadas: number; recibidas: number }>('/api/entities/bulk', { method: 'POST', json: { entidades } })
      setCsvMsg(`✓ ${r.creadas} entidades nuevas importadas como "${form.tipo}" (${r.recibidas - r.creadas} duplicadas omitidas).`)
      await load()
    } catch (e) { setCsvMsg(String(e)) } finally { setBusy(false) }
  }

  async function crear() {
    setBusy(true)
    try {
      await api('/api/entities', { method: 'POST', json: form })
      setForm({ ...form, nombre: '', descripcion: '' })
      await load()
    } finally { setBusy(false) }
  }

  async function borrar(id: string) {
    await api(`/api/entities?id=${id}`, { method: 'DELETE' })
    await load()
  }

  const grupos = TIPOS.map((t) => ({ tipo: t, items: entities.filter((e) => e.tipo === t) })).filter((g) => g.items.length > 0)

  return (
    <div>
      <PageTitle title="Modelo de la Empresa" subtitle="el mapa vivo: personas, clientes, productos, proyectos, procesos, contratos… el núcleo razona sobre este modelo" />

      <Card className="mb-6">
        <div className="hud-label mb-3">◢ Registrar entidad</div>
        <div className="flex flex-wrap gap-2">
          <Select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
            {TIPOS.map((t) => <option key={t} value={t}>{ICON[t]} {t}</option>)}
          </Select>
          <Input className="w-52 flex-1" placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          <Input className="w-64 flex-[2]" placeholder="Descripción (rol, valor, estado…)" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
          <Btn disabled={busy || !form.nombre.trim()} onClick={crear}>Registrar</Btn>
          <input ref={csvRef} type="file" accept=".csv,.txt" className="hidden" onChange={(e) => e.target.files?.[0] && importarCSV(e.target.files[0])} />
          <Btn variant="ghost" disabled={busy} onClick={() => csvRef.current?.click()}>▤ Importar CSV</Btn>
        </div>
        {csvMsg && <p className="glow-text mt-2 font-mono text-xs text-jarvis-cyan">{csvMsg}</p>}
        <p className="mt-2 font-mono text-[11px] text-jarvis-dim">CSV: primera fila = encabezados; detecto la columna &quot;nombre/cliente/empresa&quot; y el resto va a descripción. El tipo seleccionado arriba aplica a todo el archivo.</p>
      </Card>

      {/* ── Grafo empresarial: conocimiento conectado ─────────────── */}
      {entities.length >= 2 && (
        <Card className="mb-6" delay={60}>
          <div className="hud-label mb-3">◢ Grafo empresarial // conocimiento conectado ({edges.length} relaciones)</div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={linkForm.origen} onChange={(e) => setLinkForm({ ...linkForm, origen: e.target.value })}>
              <option value="">— origen —</option>
              {entities.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </Select>
            <Input className="w-40" placeholder="relación (trabaja_en…)" value={linkForm.relacion} onChange={(e) => setLinkForm({ ...linkForm, relacion: e.target.value })} />
            <span className="font-mono text-jarvis-cyan">→</span>
            <Select value={linkForm.destino} onChange={(e) => setLinkForm({ ...linkForm, destino: e.target.value })}>
              <option value="">— destino —</option>
              {entities.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </Select>
            <Btn disabled={busy || !linkForm.origen || !linkForm.relacion.trim() || !linkForm.destino} onClick={conectar}>🕸 Conectar</Btn>
          </div>
          <p className="mt-2 font-mono text-[11px] text-jarvis-dim">también por voz: &quot;Juan trabaja en el Proyecto Alfa&quot; — JARVIS conecta el grafo solo</p>

          {edges.length > 0 && (
            <>
              <div className="mt-4 border border-jarvis-line/50 bg-black/20 p-2">
                <GraphView edges={edges} entities={entities} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {edges.map((e) => (
                  <span key={e.id} className="inline-flex items-center gap-1.5 border border-jarvis-line/60 bg-black/20 px-2 py-1 font-mono text-[10px] text-jarvis-text/80">
                    {e.origen} <span className="text-jarvis-cyan">—{e.relacion}→</span> {e.destino}
                    <button className="ml-1 text-jarvis-dim hover:text-red-400" onClick={() => desconectar(e.id)}>✕</button>
                  </span>
                ))}
              </div>
            </>
          )}
        </Card>
      )}

      {entities.length === 0 && <Empty>MODELO VACÍO — registra tus clientes, productos y personas; el núcleo los conectará con cada decisión</Empty>}

      <div className="grid gap-6 md:grid-cols-2">
        {grupos.map((g, gi) => (
          <Card key={g.tipo} delay={gi * 80}>
            <div className="hud-label mb-3">
              <span className="text-jarvis-cyan">{ICON[g.tipo]}</span> {g.tipo}s // {g.items.length}
            </div>
            <div className="space-y-2">
              {g.items.map((e, i) => (
                <div key={e.id} className="flex animate-materialize items-start gap-2 border border-jarvis-line/60 bg-black/20 px-3 py-2 [clip-path:polygon(8px_0,100%_0,100%_calc(100%-8px),calc(100%-8px)_100%,0_100%,0_8px)]" style={{ animationDelay: `${i * 40}ms` }}>
                  <div className="min-w-0 flex-1">
                    <div className="font-title text-sm font-semibold text-jarvis-text">{e.nombre}</div>
                    {e.descripcion && <div className="font-mono text-[11px] text-jarvis-dim">{e.descripcion}</div>}
                  </div>
                  <button className="font-mono text-xs text-jarvis-dim transition hover:text-red-400" onClick={() => borrar(e.id)}>✕</button>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
