import { NextRequest, NextResponse } from 'next/server'
import { q } from '@/lib/db'
import { recordMemory } from '@/lib/brain'

/** Importación masiva (CSV de clientes, productos, etc.) → entidades del gemelo digital. */
export async function POST(req: NextRequest) {
  const { entidades } = await req.json() as { entidades: Array<{ tipo?: string; nombre?: string; descripcion?: string }> }
  if (!Array.isArray(entidades) || entidades.length === 0) {
    return NextResponse.json({ error: 'entidades[] requerido' }, { status: 400 })
  }
  let creadas = 0
  for (const e of entidades.slice(0, 500)) {
    const nombre = e.nombre?.trim()
    if (!nombre) continue
    const [dup] = await q<{ id: string }>(`SELECT id FROM bo_entities WHERE nombre = $1 LIMIT 1`, [nombre])
    if (dup) continue
    await q(`INSERT INTO bo_entities (tipo, nombre, descripcion) VALUES ($1, $2, $3)`,
      [e.tipo?.trim() || 'cliente', nombre, e.descripcion?.trim() || null])
    creadas++
  }
  await recordMemory('evento', `Importación masiva: ${creadas} entidades`, `De ${entidades.length} filas recibidas`)
  return NextResponse.json({ ok: true, creadas, recibidas: entidades.length })
}
