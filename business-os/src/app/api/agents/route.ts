import { NextResponse } from 'next/server'
import { q } from '@/lib/db'

export async function GET() {
  const agents = await q(
    `SELECT a.id, a.nombre, a.emoji, a.rol, a.activo,
            (SELECT count(*) FROM bo_agent_messages m WHERE m.agent_id = a.id) AS mensajes
       FROM bo_agents a WHERE a.activo ORDER BY a.nombre`,
  )
  return NextResponse.json({ agents })
}
