/**
 * Enterprise Knowledge Graph — el corazón del kernel.
 * No documentos: conocimiento CONECTADO. Juan —trabaja_en→ Proyecto A —usa→ Servidor B.
 * Todos los motores (Decision, Agents, Simulation) razonan sobre este grafo.
 */
import { q } from './db'
import { recordMemory } from './brain'

export interface GraphNode { id: string; tipo: string; nombre: string; descripcion: string | null }
export interface GraphEdge { id: string; origen_id: string; destino_id: string; origen: string; destino: string; relacion: string }

async function findOrCreateEntity(nombre: string, tipo = 'otro'): Promise<{ id: string; nombre: string; created: boolean }> {
  const [existing] = await q<{ id: string; nombre: string }>(
    `SELECT id, nombre FROM bo_entities WHERE nombre ILIKE $1 ORDER BY length(nombre) ASC LIMIT 1`,
    [`%${nombre.trim()}%`],
  )
  if (existing) return { ...existing, created: false }
  const [created] = await q<{ id: string; nombre: string }>(
    `INSERT INTO bo_entities (tipo, nombre) VALUES ($1, $2) RETURNING id, nombre`,
    [tipo, nombre.trim()],
  )
  return { ...created, created: true }
}

export async function linkEntities(
  origenNombre: string,
  relacion: string,
  destinoNombre: string,
  tipoOrigen = 'otro',
  tipoDestino = 'otro',
): Promise<{ origen: string; destino: string; relacion: string; nuevas: string[] }> {
  const origen = await findOrCreateEntity(origenNombre, tipoOrigen)
  const destino = await findOrCreateEntity(destinoNombre, tipoDestino)
  const rel = relacion.trim().toLowerCase().replace(/\s+/g, '_')

  const [dup] = await q<{ id: string }>(
    `SELECT id FROM bo_entity_links WHERE origen = $1 AND destino = $2 AND relacion = $3`,
    [origen.id, destino.id, rel],
  )
  if (!dup) {
    await q(`INSERT INTO bo_entity_links (origen, destino, relacion) VALUES ($1, $2, $3)`, [origen.id, destino.id, rel])
    await recordMemory('evento', `Grafo: ${origen.nombre} —${rel}→ ${destino.nombre}`)
  }

  const nuevas = [origen, destino].filter((e) => e.created).map((e) => e.nombre)
  return { origen: origen.nombre, destino: destino.nombre, relacion: rel, nuevas }
}

export async function getGraph(limit = 80): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  const edges = await q<GraphEdge>(
    `SELECT l.id, l.origen AS origen_id, l.destino AS destino_id, l.relacion,
            eo.nombre AS origen, ed.nombre AS destino
       FROM bo_entity_links l
       JOIN bo_entities eo ON eo.id = l.origen
       JOIN bo_entities ed ON ed.id = l.destino
      ORDER BY l.created_at DESC LIMIT $1`,
    [limit],
  )
  const nodes = await q<GraphNode>(
    `SELECT id, tipo, nombre, descripcion FROM bo_entities ORDER BY updated_at DESC LIMIT $1`,
    [limit],
  )
  return { nodes, edges }
}

export async function deleteLink(id: string): Promise<void> {
  await q(`DELETE FROM bo_entity_links WHERE id = $1`, [id])
}

/** Relaciones en texto plano para el contexto del Brain. */
export async function graphContext(limit = 40): Promise<string> {
  const edges = await q<{ origen: string; relacion: string; destino: string }>(
    `SELECT eo.nombre AS origen, l.relacion, ed.nombre AS destino
       FROM bo_entity_links l
       JOIN bo_entities eo ON eo.id = l.origen
       JOIN bo_entities ed ON ed.id = l.destino
      ORDER BY l.created_at DESC LIMIT $1`,
    [limit],
  )
  if (!edges.length) return ''
  return edges.map((e) => `${e.origen} —${e.relacion}→ ${e.destino}`).join('\n')
}
