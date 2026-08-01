import { NextResponse } from 'next/server'
import { q } from '@/lib/db'
import { getConstitution } from '@/lib/brain'

export async function GET() {
  const [constitution, counts, memory, decisions, kpis] = await Promise.all([
    getConstitution(),
    q<{ documentos: string; chunks: string; entidades: string; decisiones: string; acciones_pendientes: string; agentes: string }>(
      `SELECT
         (SELECT count(*) FROM bo_documents)  AS documentos,
         (SELECT count(*) FROM bo_chunks)     AS chunks,
         (SELECT count(*) FROM bo_entities)   AS entidades,
         (SELECT count(*) FROM bo_decisions)  AS decisiones,
         (SELECT count(*) FROM bo_actions WHERE estado = 'pendiente') AS acciones_pendientes,
         (SELECT count(*) FROM bo_agents WHERE activo) AS agentes`,
    ),
    q(`SELECT tipo, titulo, detalle, created_at FROM bo_memory ORDER BY created_at DESC LIMIT 10`),
    q(`SELECT id, pregunta, estado, analisis->>'recomendacion' AS recomendacion, analisis->>'confianza' AS confianza, created_at
         FROM bo_decisions ORDER BY created_at DESC LIMIT 5`),
    q(`SELECT k.nombre, k.unidad, k.objetivo, k.direccion, s.valor AS ultimo_valor
         FROM bo_kpis k
         LEFT JOIN LATERAL (SELECT valor FROM bo_kpi_snapshots WHERE kpi_id = k.id ORDER BY created_at DESC LIMIT 1) s ON true
        ORDER BY k.nombre LIMIT 8`),
  ])

  return NextResponse.json({
    constitution: constitution ? { empresa: constitution.empresa, version: constitution.version } : null,
    counts: counts[0],
    memory,
    decisions,
    kpis,
  })
}
