import { NextRequest, NextResponse } from 'next/server'
import { q } from '@/lib/db'

export async function GET() {
  const actions = await q(
    `SELECT id, tipo, titulo, detalle, estado, resultado, origen, created_at, executed_at
       FROM bo_actions ORDER BY (estado = 'pendiente') DESC, created_at DESC LIMIT 200`,
  )
  return NextResponse.json({ actions })
}

export async function POST(req: NextRequest) {
  const { tipo, titulo, detalle } = await req.json()
  if (!tipo?.trim() || !titulo?.trim()) {
    return NextResponse.json({ error: 'tipo y titulo son requeridos' }, { status: 400 })
  }
  const [row] = await q<{ id: string }>(
    `INSERT INTO bo_actions (tipo, titulo, detalle, origen) VALUES ($1, $2, $3, 'manual') RETURNING id`,
    [tipo.trim(), titulo.trim(), detalle?.trim() || null],
  )
  return NextResponse.json({ ok: true, id: row.id })
}
