/**
 * Onboarding Ingestor — el Business OS entrevista al dueño y se auto-configura.
 * De la entrevista salen: Constitución, entidades (gemelo digital), KPIs y
 * automatizaciones sugeridas — adaptadas a la industria (packs verticales dinámicos).
 */
import { q } from './db'
import { askClaudeJSON } from './ai'
import { recordMemory } from './brain'
import { audit } from './audit'
import { createSchedule } from './scheduler'

export interface QA { q: string; a: string }

export interface Propuesta {
  empresa: string
  resumen: string
  constitucion_md: string
  entidades: Array<{ tipo: string; nombre: string; descripcion: string }>
  kpis: Array<{ nombre: string; unidad: string; objetivo: number | null; direccion: 'subir' | 'bajar'; valor_actual: number | null }>
  crons: Array<{ nombre: string; cron: string; instruccion: string }>
}

export type InterviewResult =
  | { done: false; pregunta: string; progreso: number }
  | { done: true; propuesta: Propuesta }

export async function interviewStep(historial: QA[]): Promise<InterviewResult> {
  const transcript = historial.map((h, i) => `P${i + 1}: ${h.q}\nR${i + 1}: ${h.a}`).join('\n\n')

  return askClaudeJSON<InterviewResult>(
    `Eres el ONBOARDING INGESTOR de un Business OS (sistema operativo inteligente de empresas). Estás entrevistando al dueño de una empresa para construir su "gemelo digital": constitución, entidades, KPIs y automatizaciones.

ENTREVISTA HASTA AHORA:
${transcript || '(aún no hay preguntas — es el inicio)'}

TU TRABAJO:
- Haz UNA pregunta a la vez, en español, cálida pero directa, adaptada a lo que ya sabes.
- Cubre en total (en este orden aproximado): 1) nombre de la empresa e industria, 2) qué vende y a quién, 3) productos/servicios principales con precios, 4) equipo (quiénes y qué hacen), 5) clientes o proveedores clave, 6) las 3-5 métricas que más le importan con sus valores actuales, 7) metas y prioridades del año, 8) qué decisiones exigen SIEMPRE su aprobación.
- Si una respuesta ya cubrió varios temas, no los repitas. Máximo 8 preguntas en total.
- "progreso" = porcentaje estimado de la entrevista (0-100).

CUANDO TENGAS SUFICIENTE (≈7-8 respuestas o el dueño diga "ya", "listo", "termina"):
devuelve done:true con la propuesta completa. Adapta los tipos de entidad, KPIs y crons a SU industria (una zapatería no mide lo mismo que una clínica). NUNCA inventes datos que el dueño no dio: si falta un valor, usa null.

Responde SOLO uno de estos dos JSON:
{"done": false, "pregunta": "...", "progreso": 40}
o
{"done": true, "propuesta": {
  "empresa": "...",
  "resumen": "síntesis de la empresa en 2-3 frases",
  "constitucion_md": "constitución empresarial completa en markdown: ## Identidad, ## Misión del Business OS (memoria, analista, coordinador, copiloto), ## Principios de razonamiento, ## Límites (lo que exige aprobación del dueño según lo que dijo), ## Tono, ## Prioridades actuales — máx 500 palabras, concreta, con los datos reales de la entrevista",
  "entidades": [{"tipo": "persona|cliente|producto|proveedor|proyecto|proceso|contrato|activo|otro", "nombre": "...", "descripcion": "..."}],
  "kpis": [{"nombre": "...", "unidad": "...", "objetivo": 123 o null, "direccion": "subir|bajar", "valor_actual": 123 o null}],
  "crons": [{"nombre": "...", "cron": "expresión 5 campos", "instruccion": "instrucción en lenguaje natural"}]
}}`,
  )
}

export async function applyOnboarding(p: Propuesta): Promise<{ entidades: number; kpis: number; crons: number; version: number }> {
  // 1. Constitución
  const prev = await q<{ version: number }>(`SELECT version FROM bo_constitution WHERE activa ORDER BY version DESC LIMIT 1`)
  const version = (prev[0]?.version ?? 0) + 1
  await q(`UPDATE bo_constitution SET activa = false WHERE activa`)
  await q(`INSERT INTO bo_constitution (version, empresa, contenido, activa) VALUES ($1, $2, $3, true)`, [version, p.empresa, p.constitucion_md])

  // 2. Entidades (gemelo digital)
  let entidades = 0
  for (const e of p.entidades ?? []) {
    if (!e.nombre?.trim()) continue
    await q(`INSERT INTO bo_entities (tipo, nombre, descripcion) VALUES ($1, $2, $3)`, [e.tipo || 'otro', e.nombre.trim(), e.descripcion ?? null])
    entidades++
  }

  // 3. KPIs con valor inicial si lo dio
  let kpis = 0
  for (const k of p.kpis ?? []) {
    if (!k.nombre?.trim()) continue
    const [row] = await q<{ id: string }>(
      `INSERT INTO bo_kpis (nombre, unidad, objetivo, direccion) VALUES ($1, $2, $3, $4)
       ON CONFLICT (nombre) DO UPDATE SET unidad = $2, objetivo = $3, direccion = $4 RETURNING id`,
      [k.nombre.trim(), k.unidad || null, k.objetivo ?? null, k.direccion === 'bajar' ? 'bajar' : 'subir'],
    )
    if (k.valor_actual !== null && k.valor_actual !== undefined) {
      await q(`INSERT INTO bo_kpi_snapshots (kpi_id, valor, nota) VALUES ($1, $2, 'onboarding')`, [row.id, k.valor_actual])
    }
    kpis++
  }

  // 4. Automatizaciones sugeridas
  let crons = 0
  for (const c of p.crons ?? []) {
    if (!c.nombre?.trim() || !c.cron?.trim() || !c.instruccion?.trim()) continue
    try {
      await createSchedule(c.nombre.trim(), c.cron.trim(), c.instruccion.trim())
      crons++
    } catch { /* cron inválido: se omite */ }
  }

  await recordMemory('evento', `Business OS fundado para ${p.empresa}`, `${p.resumen} — ${entidades} entidades, ${kpis} KPIs, ${crons} automatizaciones`)
  await audit('sistema', 'onboarding', `Fundación de ${p.empresa}: constitución v${version}, ${entidades} entidades, ${kpis} KPIs, ${crons} crons`)

  return { entidades, kpis, crons, version }
}
