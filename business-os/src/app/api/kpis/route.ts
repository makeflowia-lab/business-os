import { NextRequest, NextResponse } from 'next/server'
import { q } from '@/lib/db'
import { recordMemory } from '@/lib/brain'

export async function GET() {
  const kpis = await q(
    `SELECT k.id, k.nombre, k.unidad, k.objetivo, k.direccion,
            s.valor AS ultimo_valor, s.created_at AS ultima_fecha,
            (SELECT json_agg(json_build_object('valor', h.valor, 'fecha', h.created_at) ORDER BY h.created_at)
               FROM (SELECT valor, created_at FROM bo_kpi_snapshots WHERE kpi_id = k.id ORDER BY created_at DESC LIMIT 12) h
            ) AS historia
       FROM bo_kpis k
       LEFT JOIN LATERAL (
         SELECT valor, created_at FROM bo_kpi_snapshots WHERE kpi_id = k.id ORDER BY created_at DESC LIMIT 1
       ) s ON true
      ORDER BY k.nombre`,
  )
  return NextResponse.json({ kpis })
}

export async function POST(req: NextRequest) {
  const { nombre, unidad, objetivo, direccion } = await req.json()
  if (!nombre?.trim()) return NextResponse.json({ error: 'nombre requerido' }, { status: 400 })
  const [row] = await q<{ id: string }>(
    `INSERT INTO bo_kpis (nombre, unidad, objetivo, direccion) VALUES ($1, $2, $3, $4)
     ON CONFLICT (nombre) DO UPDATE SET unidad = $2, objetivo = $3, direccion = $4 RETURNING id`,
    [nombre.trim(), unidad?.trim() || null, objetivo ?? null, direccion === 'bajar' ? 'bajar' : 'subir'],
  )
  return NextResponse.json({ ok: true, id: row.id })
}

export async function PUT(req: NextRequest) {
  const { kpiId, valor, nota } = await req.json()
  if (!kpiId || valor === undefined || valor === null || valor === '') {
    return NextResponse.json({ error: 'kpiId y valor son requeridos' }, { status: 400 })
  }
  await q(`INSERT INTO bo_kpi_snapshots (kpi_id, valor, nota) VALUES ($1, $2, $3)`, [kpiId, valor, nota?.trim() || null])
  const [kpi] = await q<{ nombre: string }>(`SELECT nombre FROM bo_kpis WHERE id = $1`, [kpiId])
  await recordMemory('evento', `KPI actualizado: ${kpi?.nombre ?? kpiId} = ${valor}`, nota?.trim())
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })
  await q(`DELETE FROM bo_kpis WHERE id = $1`, [id])
  return NextResponse.json({ ok: true })
}
