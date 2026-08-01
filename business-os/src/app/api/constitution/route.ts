import { NextRequest, NextResponse } from 'next/server'
import { q } from '@/lib/db'
import { getConstitution, recordMemory } from '@/lib/brain'
import { audit } from '@/lib/audit'

export async function GET() {
  const constitution = await getConstitution()
  return NextResponse.json({ constitution })
}

export async function PUT(req: NextRequest) {
  const { empresa, contenido } = await req.json()
  if (!empresa?.trim() || !contenido?.trim()) {
    return NextResponse.json({ error: 'empresa y contenido son requeridos' }, { status: 400 })
  }
  const prev = await q<{ version: number }>(`SELECT version FROM bo_constitution WHERE activa ORDER BY version DESC LIMIT 1`)
  const version = (prev[0]?.version ?? 0) + 1
  await q(`UPDATE bo_constitution SET activa = false WHERE activa`)
  await q(`INSERT INTO bo_constitution (version, empresa, contenido, activa) VALUES ($1, $2, $3, true)`, [version, empresa.trim(), contenido])
  await recordMemory('evento', `Constitución Empresarial actualizada a v${version}`, `Empresa: ${empresa.trim()}`)
  await audit('web', 'constitucion', `${empresa.trim()} → v${version}`)
  return NextResponse.json({ ok: true, version })
}
