/**
 * Enterprise Brain — construye el contexto vivo de la empresa.
 * Todos los agentes y el Decision Engine razonan sobre este mismo cerebro.
 */
import { q } from './db'

export interface BrainContextOptions {
  topic?: string      // si se da, busca conocimiento relevante vía FTS
  maxChunks?: number
}

export async function getConstitution(): Promise<{ empresa: string; contenido: string; version: number } | null> {
  const rows = await q<{ empresa: string; contenido: string; version: number }>(
    `SELECT empresa, contenido, version FROM bo_constitution WHERE activa = true ORDER BY version DESC LIMIT 1`,
  )
  return rows[0] ?? null
}

async function getEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) return null
  try {
    const res = await fetch('https://openrouter.ai/api/v1/embeddings', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'openai/text-embedding-3-small', input: text.slice(0, 8000) }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.data?.[0]?.embedding || null
  } catch (e) { return null }
}

export async function searchKnowledge(topic: string, limit = 8): Promise<Array<{ titulo: string; contenido: string }>> {
  const embedding = await getEmbedding(topic)
  
  if (embedding) {
    // Búsqueda vectorial semántica (HNSW)
    const vecResults = await q<{ titulo: string; contenido: string }>(
      `SELECT d.titulo, c.contenido
         FROM bo_chunks c JOIN bo_documents d ON d.id = c.document_id
        WHERE c.embedding IS NOT NULL
        ORDER BY c.embedding <=> $1::vector
        LIMIT $2`,
      [JSON.stringify(embedding), limit]
    )
    if (vecResults.length > 0) return vecResults
  }

  // Fallback: FTS en español
  const fts = await q<{ titulo: string; contenido: string }>(
    `SELECT d.titulo, c.contenido
       FROM bo_chunks c JOIN bo_documents d ON d.id = c.document_id
      WHERE c.tsv @@ websearch_to_tsquery('spanish', $1)
      ORDER BY ts_rank(c.tsv, websearch_to_tsquery('spanish', $1)) DESC
      LIMIT $2`,
    [topic, limit],
  )
  if (fts.length > 0) return fts

  // Fallback final: similitud de trigramas
  return q<{ titulo: string; contenido: string }>(
    `SELECT d.titulo, c.contenido
       FROM bo_chunks c JOIN bo_documents d ON d.id = c.document_id
      ORDER BY similarity(c.contenido, $1) DESC
      LIMIT $2`,
    [topic, limit],
  )
}

export async function buildBrainContext(opts: BrainContextOptions = {}): Promise<string> {
  const [constitution, entities, entityCounts, kpis, memory, decisions, pendingActions, relations, aprendizajes] = await Promise.all([
    getConstitution(),
    q<{ tipo: string; nombre: string; descripcion: string | null }>(
      `SELECT tipo, nombre, descripcion FROM bo_entities ORDER BY updated_at DESC LIMIT 40`,
    ),
    q<{ tipo: string; n: string }>(`SELECT tipo, count(*) AS n FROM bo_entities GROUP BY tipo`),
    q<{ nombre: string; unidad: string | null; objetivo: string | null; direccion: string; valor: string | null; fecha: Date | null }>(
      `SELECT k.nombre, k.unidad, k.objetivo::text, k.direccion, s.valor::text, s.created_at AS fecha
         FROM bo_kpis k
         LEFT JOIN LATERAL (
           SELECT valor, created_at FROM bo_kpi_snapshots WHERE kpi_id = k.id ORDER BY created_at DESC LIMIT 1
         ) s ON true
        ORDER BY k.nombre`,
    ),
    q<{ tipo: string; titulo: string; detalle: string | null; created_at: Date }>(
      `SELECT tipo, titulo, detalle, created_at FROM bo_memory ORDER BY created_at DESC LIMIT 15`,
    ),
    q<{ pregunta: string; analisis: { recomendacion?: string } | null }>(
      `SELECT pregunta, analisis FROM bo_decisions WHERE estado = 'completada' ORDER BY completed_at DESC LIMIT 5`,
    ),
    q<{ n: string }>(`SELECT count(*) AS n FROM bo_actions WHERE estado = 'pendiente'`),
    q<{ origen: string; relacion: string; destino: string }>(
      `SELECT eo.nombre AS origen, l.relacion, ed.nombre AS destino
         FROM bo_entity_links l
         JOIN bo_entities eo ON eo.id = l.origen
         JOIN bo_entities ed ON ed.id = l.destino
        ORDER BY l.created_at DESC LIMIT 40`,
    ),
    q<{ titulo: string; detalle: string | null }>(
      `SELECT titulo, detalle FROM bo_memory WHERE tipo = 'aprendizaje' ORDER BY created_at DESC LIMIT 6`,
    ),
  ])

  const parts: string[] = []

  if (constitution) {
    parts.push(`# CONSTITUCIÓN EMPRESARIAL — ${constitution.empresa} (v${constitution.version})\n${constitution.contenido.slice(0, 5000)}`)
  } else {
    parts.push(`# CONSTITUCIÓN EMPRESARIAL\n(No definida aún — el Business OS opera sin documento fundacional.)`)
  }

  if (entityCounts.length > 0) {
    const counts = entityCounts.map((c) => `${c.tipo}: ${c.n}`).join(' · ')
    const list = entities.map((e) => `- [${e.tipo}] ${e.nombre}${e.descripcion ? ` — ${e.descripcion.slice(0, 120)}` : ''}`).join('\n')
    parts.push(`# MODELO DE LA EMPRESA (entidades)\nTotales: ${counts}\n${list}`)
  }

  if (relations.length > 0) {
    parts.push(`# GRAFO EMPRESARIAL (conocimiento conectado)\n${relations.map((r) => `${r.origen} —${r.relacion}→ ${r.destino}`).join('\n')}`)
  }

  if (aprendizajes.length > 0) {
    parts.push(`# APRENDIZAJES DEL LEARNING ENGINE (aplícalos al razonar)\n${aprendizajes.map((a) => `- ${a.titulo}${a.detalle ? `: ${a.detalle.slice(0, 200)}` : ''}`).join('\n')}`)
  }

  if (kpis.length > 0) {
    const list = kpis.map((k) =>
      `- ${k.nombre}: ${k.valor ?? 'sin dato'}${k.unidad ? ` ${k.unidad}` : ''}${k.objetivo ? ` (objetivo: ${k.objetivo}, dirección: ${k.direccion})` : ''}${k.fecha ? ` [${new Date(k.fecha).toISOString().slice(0, 10)}]` : ''}`,
    ).join('\n')
    parts.push(`# KPIs ACTUALES\n${list}`)
  }

  if (memory.length > 0) {
    const list = memory.map((m) =>
      `- [${new Date(m.created_at).toISOString().slice(0, 10)}] (${m.tipo}) ${m.titulo}${m.detalle ? ` — ${m.detalle.slice(0, 150)}` : ''}`,
    ).join('\n')
    parts.push(`# MEMORIA EMPRESARIAL (eventos recientes)\n${list}`)
  }

  if (decisions.length > 0) {
    const list = decisions.map((d) =>
      `- "${d.pregunta}" → ${d.analisis?.recomendacion?.slice(0, 200) ?? 'sin recomendación'}`,
    ).join('\n')
    parts.push(`# DECISIONES PREVIAS\n${list}`)
  }

  if (opts.topic) {
    const chunks = await searchKnowledge(opts.topic, opts.maxChunks ?? 8)
    if (chunks.length > 0) {
      const list = chunks.map((c) => `--- [${c.titulo}] ---\n${c.contenido}`).join('\n\n')
      parts.push(`# CONOCIMIENTO RELEVANTE (búsqueda: "${opts.topic}")\n${list}`)
    }
  }

  parts.push(`# ESTADO OPERATIVO\nAcciones pendientes de aprobación: ${pendingActions[0]?.n ?? 0}`)

  const { policyContext } = await import('./policy')
  parts.push(await policyContext())

  const { feedbackContext } = await import('./feedback')
  const fb = await feedbackContext()
  if (fb) parts.push(fb)

  return parts.join('\n\n═══════════════\n\n')
}

export async function recordMemory(tipo: string, titulo: string, detalle?: string, refId?: string): Promise<void> {
  await q(
    `INSERT INTO bo_memory (tipo, titulo, detalle, ref_id) VALUES ($1, $2, $3, $4)`,
    [tipo, titulo, detalle ?? null, refId ?? null],
  )
}
