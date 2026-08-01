/**
 * Feedback del dueño (👍/👎) — el combustible del Learning Engine.
 * Ataca el "learning gap" (causa #1 del fracaso de IA empresarial según MIT):
 * las correcciones se inyectan al contexto del Brain y a la reflexión periódica.
 */
import { q } from './db'
import { recordMemory } from './brain'

export async function saveFeedback(input: {
  contexto: 'jarvis' | 'agente'
  referencia?: string
  respuesta: string
  voto: 'up' | 'down'
  nota?: string
}): Promise<void> {
  await q(
    `INSERT INTO bo_feedback (contexto, referencia, respuesta, voto, nota) VALUES ($1, $2, $3, $4, $5)`,
    [input.contexto, input.referencia ?? null, input.respuesta.slice(0, 1500), input.voto, input.nota?.trim() || null],
  )
  if (input.voto === 'down') {
    await recordMemory(
      'aprendizaje',
      `Corrección del dueño${input.referencia ? ` (${input.referencia})` : ''}`,
      `${input.nota ? `Indicación: ${input.nota}. ` : ''}Respuesta marcada como incorrecta: "${input.respuesta.slice(0, 200)}"`,
    )
  }
}

/** Correcciones recientes para el contexto del Brain — el OS no repite lo que el dueño rechazó. */
export async function feedbackContext(): Promise<string> {
  const downs = await q<{ referencia: string | null; respuesta: string; nota: string | null }>(
    `SELECT referencia, respuesta, nota FROM bo_feedback WHERE voto = 'down' ORDER BY created_at DESC LIMIT 8`,
  )
  if (!downs.length) return ''
  const lineas = downs.map((d) =>
    `- ${d.nota ? `El dueño corrigió: "${d.nota}"` : 'El dueño marcó como INCORRECTO'}${d.referencia ? ` [${d.referencia}]` : ''} → respuesta rechazada: "${d.respuesta.slice(0, 150)}"`,
  )
  return `# CORRECCIONES DEL DUEÑO (no repitas estos enfoques)\n${lineas.join('\n')}`
}

export async function feedbackStats(dias = 30): Promise<{ up: number; down: number }> {
  const rows = await q<{ voto: string; n: string }>(
    `SELECT voto, count(*) AS n FROM bo_feedback WHERE created_at > now() - make_interval(days => $1) GROUP BY voto`,
    [dias],
  )
  return {
    up: Number(rows.find((r) => r.voto === 'up')?.n ?? 0),
    down: Number(rows.find((r) => r.voto === 'down')?.n ?? 0),
  }
}
