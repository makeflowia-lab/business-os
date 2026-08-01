import { NextRequest, NextResponse } from 'next/server'
import { q } from '@/lib/db'
import { recordMemory } from '@/lib/brain'

export async function GET() {
  const entities = await q(
    `SELECT id, tipo, nombre, descripcion, datos, created_at FROM bo_entities ORDER BY tipo, nombre LIMIT 500`,
  )
  return NextResponse.json({ entities })
}

export async function POST(req: NextRequest) {
  const { tipo, nombre, descripcion } = await req.json()
  if (!tipo?.trim() || !nombre?.trim()) {
    return NextResponse.json({ error: 'tipo y nombre son requeridos' }, { status: 400 })
  }
  const [row] = await q<{ id: string }>(
    `INSERT INTO bo_entities (tipo, nombre, descripcion) VALUES ($1, $2, $3) RETURNING id`,
    [tipo.trim(), nombre.trim(), descripcion?.trim() || null],
  )
  await recordMemory('evento', `Entidad registrada: ${nombre.trim()} (${tipo.trim()})`, descripcion?.trim(), row.id)
  return NextResponse.json({ ok: true, id: row.id })
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })
  await q(`DELETE FROM bo_entities WHERE id = $1`, [id])
  return NextResponse.json({ ok: true })
}
