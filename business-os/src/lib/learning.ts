/**
 * Learning Engine — el kernel aprende de su propia operación.
 * Analiza la memoria, decisiones y telemetría del período y destila
 * aprendizajes accionables que quedan en la memoria (tipo 'aprendizaje')
 * y alimentan el contexto de TODOS los motores a partir de ese momento.
 */
import { q } from './db'
import { askClaudeJSON } from './ai'
import { recordMemory } from './brain'

interface Reflexion {
  resumen: string
  aprendizajes: Array<{ titulo: string; detalle: string }>
  alertas: string[]
}

export async function runReflection(dias = 7): Promise<string> {
  const [memoria, decisiones, kpis, acciones, feedback] = await Promise.all([
    q<{ tipo: string; titulo: string; detalle: string | null; created_at: Date }>(
      `SELECT tipo, titulo, detalle, created_at FROM bo_memory WHERE created_at > now() - make_interval(days => $1) ORDER BY created_at ASC LIMIT 80`,
      [dias],
    ),
    q<{ pregunta: string; analisis: { recomendacion?: string; confianza?: number } | null }>(
      `SELECT pregunta, analisis FROM bo_decisions WHERE created_at > now() - make_interval(days => $1) AND estado = 'completada' LIMIT 15`,
      [dias],
    ),
    q<{ nombre: string; valores: string }>(
      `SELECT k.nombre, string_agg(s.valor::text, ' → ' ORDER BY s.created_at) AS valores
         FROM bo_kpis k JOIN bo_kpi_snapshots s ON s.kpi_id = k.id
        WHERE s.created_at > now() - make_interval(days => $1)
        GROUP BY k.nombre`,
      [dias],
    ),
    q<{ estado: string; n: string }>(
      `SELECT estado, count(*) AS n FROM bo_actions WHERE created_at > now() - make_interval(days => $1) GROUP BY estado`,
      [dias],
    ),
    q<{ voto: string; referencia: string | null; nota: string | null; respuesta: string }>(
      `SELECT voto, referencia, nota, respuesta FROM bo_feedback WHERE created_at > now() - make_interval(days => $1) ORDER BY created_at DESC LIMIT 20`,
      [dias],
    ),
  ])

  if (memoria.length === 0 && decisiones.length === 0 && kpis.length === 0) {
    return `Sin actividad en los últimos ${dias} días — nada que aprender todavía. Alimenta el Brain y vuelve a reflexionar.`
  }

  const r = await askClaudeJSON<Reflexion>(
    `Eres el LEARNING ENGINE de un Business OS. Analiza la operación de los últimos ${dias} días y destila APRENDIZAJES: patrones, errores repetidos, señales tempranas, qué funcionó y por qué. No resumas — aprende. Cada aprendizaje debe cambiar cómo la empresa decide en el futuro.

ACTIVIDAD (memoria empresarial):
${memoria.map((m) => `[${new Date(m.created_at).toISOString().slice(0, 10)}] (${m.tipo}) ${m.titulo}${m.detalle ? ` — ${m.detalle.slice(0, 120)}` : ''}`).join('\n') || '(vacía)'}

DECISIONES DEL PERÍODO:
${decisiones.map((d) => `- "${d.pregunta}" → ${d.analisis?.recomendacion?.slice(0, 150) ?? '?'} (confianza ${d.analisis?.confianza ?? '?'}%)`).join('\n') || '(ninguna)'}

EVOLUCIÓN DE KPIs:
${kpis.map((k) => `- ${k.nombre}: ${k.valores}`).join('\n') || '(sin datos)'}

ACCIONES: ${acciones.map((a) => `${a.estado}: ${a.n}`).join(', ') || 'ninguna'}

FEEDBACK DEL DUEÑO (la señal más valiosa — pondérala fuerte):
${feedback.map((f) => `- [${f.voto === 'up' ? '👍' : '👎'}]${f.referencia ? ` (${f.referencia})` : ''}${f.nota ? ` corrección: "${f.nota}"` : ''} sobre: "${f.respuesta.slice(0, 120)}"`).join('\n') || '(sin feedback en el período)'}

Reglas: máximo 5 aprendizajes, concretos y accionables. Si los datos son pocos, dilo en el resumen y aprende solo lo que el dato soporta — NUNCA inventes.

JSON: {"resumen": "...", "aprendizajes": [{"titulo": "...", "detalle": "qué observaste y cómo aplicarlo"}], "alertas": ["señal que requiere atención del dueño"]}`,
  )

  for (const a of r.aprendizajes ?? []) {
    await recordMemory('aprendizaje', a.titulo, a.detalle)
  }

  const partes = [
    `🧬 REFLEXIÓN (últimos ${dias} días)`,
    r.resumen,
    r.aprendizajes?.length ? `APRENDIZAJES GUARDADOS:\n${r.aprendizajes.map((a) => `• ${a.titulo}\n  ${a.detalle}`).join('\n')}` : '',
    r.alertas?.length ? `⚠ ALERTAS:\n${r.alertas.map((x) => `• ${x}`).join('\n')}` : '',
  ]
  return partes.filter(Boolean).join('\n\n')
}
