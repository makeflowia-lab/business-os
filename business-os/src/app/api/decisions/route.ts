import { NextRequest, NextResponse } from 'next/server'
import { q } from '@/lib/db'
import { runDecision } from '@/lib/engine'

export const maxDuration = 600

export async function GET() {
  const decisions = await q(
    `SELECT id, pregunta, estado, analisis, created_at, completed_at FROM bo_decisions ORDER BY created_at DESC LIMIT 100`,
  )
  return NextResponse.json({ decisions })
}

export async function POST(req: NextRequest) {
  const { pregunta } = await req.json()
  if (!pregunta?.trim()) return NextResponse.json({ error: 'pregunta requerida' }, { status: 400 })

  try {
    const { id, analisis } = await runDecision(pregunta.trim())
    return NextResponse.json({ ok: true, id, analisis })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
