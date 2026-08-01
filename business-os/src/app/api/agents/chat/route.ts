import { NextRequest, NextResponse } from 'next/server'
import { q } from '@/lib/db'
import { chatWithAgent } from '@/lib/engine'

export const maxDuration = 600

export async function GET(req: NextRequest) {
  const agentId = req.nextUrl.searchParams.get('agentId')
  if (!agentId) return NextResponse.json({ error: 'agentId requerido' }, { status: 400 })
  const messages = await q(
    `SELECT role, contenido, created_at FROM bo_agent_messages WHERE agent_id = $1 ORDER BY created_at ASC LIMIT 100`,
    [agentId],
  )
  return NextResponse.json({ messages })
}

export async function DELETE(req: NextRequest) {
  const agentId = req.nextUrl.searchParams.get('agentId')
  if (!agentId) return NextResponse.json({ error: 'agentId requerido' }, { status: 400 })
  await q(`DELETE FROM bo_agent_messages WHERE agent_id = $1`, [agentId])
  return NextResponse.json({ ok: true })
}

export async function POST(req: NextRequest) {
  const { agentId, message } = await req.json()
  if (!agentId || !message?.trim()) {
    return NextResponse.json({ error: 'agentId y message son requeridos' }, { status: 400 })
  }
  try {
    const respuesta = await chatWithAgent(agentId, message.trim())
    return NextResponse.json({ respuesta })
  } catch (err) {
    const msg = String(err)
    return NextResponse.json({ error: msg }, { status: msg.includes('no encontrado') ? 404 : 500 })
  }
}
