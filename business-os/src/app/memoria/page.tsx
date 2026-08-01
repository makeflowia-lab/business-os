'use client'

import { useEffect, useState } from 'react'
import { api, fecha } from '@/lib/client'
import { Card, PageTitle, Badge, Empty, Spinner } from '@/components/ui'

interface Evento { tipo: string; titulo: string; detalle: string | null; created_at: string }

export default function MemoriaPage() {
  const [memory, setMemory] = useState<Evento[] | null>(null)
  const [filtro, setFiltro] = useState('todos')

  useEffect(() => {
    api<{ memory: Evento[] }>('/api/memory?limit=200').then((r) => setMemory(r.memory)).catch(console.error)
  }, [])

  if (!memory) return <div className="pt-16 text-center"><Spinner label="cargando memoria empresarial…" /></div>

  const tipos = ['todos', ...Array.from(new Set(memory.map((m) => m.tipo)))]
  const visibles = filtro === 'todos' ? memory : memory.filter((m) => m.tipo === filtro)

  return (
    <div>
      <PageTitle title="Memoria Empresarial" subtitle="el historial vivo del negocio: decisiones, conocimiento, acciones, eventos y conversaciones — nada se olvida" />

      <div className="mb-4 flex animate-materialize flex-wrap gap-2">
        {tipos.map((t) => (
          <button
            key={t}
            onClick={() => setFiltro(t)}
            className={`border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.25em] transition [clip-path:polygon(6px_0,100%_0,100%_calc(100%-6px),calc(100%-6px)_100%,0_100%,0_6px)] ${
              filtro === t ? 'glow-text border-jarvis-cyan/60 bg-jarvis-cyan/15 text-jarvis-glow' : 'border-jarvis-line text-jarvis-dim hover:text-jarvis-text'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {visibles.length === 0 && <Empty>MEMORIA VACÍA — todo lo que hagas quedará registrado aquí</Empty>}

      <Card>
        <div className="space-y-3">
          {visibles.map((m, i) => (
            <div key={i} className="flex animate-materialize items-start gap-3 border-l border-jarvis-line/70 pl-3" style={{ animationDelay: `${Math.min(i, 15) * 30}ms` }}>
              <Badge tone={m.tipo}>{m.tipo}</Badge>
              <div className="min-w-0 flex-1">
                <div className="text-sm text-jarvis-text/90">{m.titulo}</div>
                {m.detalle && <div className="mt-0.5 font-mono text-[11px] leading-relaxed text-jarvis-dim">{m.detalle}</div>}
                <div className="font-mono text-[10px] tracking-wider text-jarvis-dim/70">{fecha(m.created_at)}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
