import { NextRequest, NextResponse } from 'next/server'
import { saveFeedback } from '@/lib/feedback'

export async function POST(req: NextRequest) {
  const { contexto, referencia, respuesta, voto, nota } = await req.json()
  if (!['jarvis', 'agente'].includes(contexto) || !['up', 'down'].includes(voto) || !respuesta?.trim()) {
    return NextResponse.json({ error: 'contexto (jarvis|agente), voto (up|down) y respuesta son requeridos' }, { status: 400 })
  }
  await saveFeedback({ contexto, referencia, respuesta, voto, nota })
  return NextResponse.json({ ok: true })
}
