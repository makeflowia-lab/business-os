/**
 * Centinela — reglas de eventos sobre KPIs.
 * El Business OS no solo reacciona a instrucciones y crons: vigila los datos.
 * "Si el MRR baja de 1000 → avísame y ejecuta X" se evalúa en cada tick del scheduler.
 */
import { q } from './db'
import { recordMemory } from './brain'
import { audit } from './audit'

export interface Rule {
  id: string; nombre: string; kpi_id: string; kpi_nombre?: string
  condicion: 'menor' | 'mayor'; umbral: string; instruccion: string | null
  activo: boolean; cooldown_horas: number; last_triggered: Date | null
  ultimo_valor?: string | null
}

export async function listRules(): Promise<Rule[]> {
  return q<Rule>(
    `SELECT r.*, k.nombre AS kpi_nombre, s.valor::text AS ultimo_valor
       FROM bo_rules r
       JOIN bo_kpis k ON k.id = r.kpi_id
       LEFT JOIN LATERAL (SELECT valor FROM bo_kpi_snapshots WHERE kpi_id = r.kpi_id ORDER BY created_at DESC LIMIT 1) s ON true
      ORDER BY r.created_at DESC`,
  )
}

export async function createRule(input: { nombre: string; kpiNombre: string; condicion: 'menor' | 'mayor'; umbral: number; instruccion?: string; cooldownHoras?: number }): Promise<Rule> {
  const [kpi] = await q<{ id: string; nombre: string }>(
    `SELECT id, nombre FROM bo_kpis WHERE nombre ILIKE $1 ORDER BY length(nombre) ASC LIMIT 1`,
    [`%${input.kpiNombre}%`],
  )
  if (!kpi) throw new Error(`No existe un KPI que coincida con "${input.kpiNombre}". Créalo primero.`)

  const [rule] = await q<Rule>(
    `INSERT INTO bo_rules (nombre, kpi_id, condicion, umbral, instruccion, cooldown_horas)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [input.nombre, kpi.id, input.condicion, input.umbral, input.instruccion ?? null, input.cooldownHoras ?? 24],
  )
  await recordMemory('evento', `Regla centinela creada: ${input.nombre}`, `${kpi.nombre} ${input.condicion === 'menor' ? '<' : '>'} ${input.umbral}${input.instruccion ? ` → ${input.instruccion}` : ''}`, rule.id)
  return { ...rule, kpi_nombre: kpi.nombre }
}

export async function setRuleActive(id: string, activo: boolean): Promise<void> {
  await q(`UPDATE bo_rules SET activo = $2 WHERE id = $1`, [id, activo])
}

export async function deleteRule(id: string): Promise<void> {
  await q(`DELETE FROM bo_rules WHERE id = $1`, [id])
}

/**
 * Evalúa todas las reglas activas contra el último valor de su KPI.
 * Si una regla dispara: notifica al dueño y (si tiene instrucción) la ejecuta con el router.
 */
export async function checkRules(
  execute: (instruccion: string) => Promise<string>,
  notify: (text: string) => Promise<void>,
): Promise<number> {
  const due = await q<Rule & { valor: string | null }>(
    `SELECT r.*, k.nombre AS kpi_nombre, s.valor::text AS valor
       FROM bo_rules r
       JOIN bo_kpis k ON k.id = r.kpi_id
       LEFT JOIN LATERAL (SELECT valor FROM bo_kpi_snapshots WHERE kpi_id = r.kpi_id ORDER BY created_at DESC LIMIT 1) s ON true
      WHERE r.activo
        AND s.valor IS NOT NULL
        AND ((r.condicion = 'menor' AND s.valor < r.umbral) OR (r.condicion = 'mayor' AND s.valor > r.umbral))
        AND (r.last_triggered IS NULL OR r.last_triggered < now() - make_interval(hours => r.cooldown_horas))`,
  )

  for (const r of due) {
    await q(`UPDATE bo_rules SET last_triggered = now() WHERE id = $1`, [r.id])
    const desc = `${r.kpi_nombre} = ${r.valor} (umbral: ${r.condicion === 'menor' ? '<' : '>'} ${r.umbral})`
    await recordMemory('evento', `🚨 Regla disparada: ${r.nombre}`, desc, r.id)
    await audit('regla', 'regla_disparada', `${r.nombre} — ${desc}`)
    await notify(`🚨 CENTINELA: ${r.nombre}\n${desc}`)

    if (r.instruccion) {
      try {
        const result = await execute(r.instruccion)
        await notify(`↳ Ejecutado: ${r.instruccion}\n\n${result}`)
      } catch (err) {
        await notify(`↳ ⚠️ Error ejecutando "${r.instruccion}": ${String(err).slice(0, 300)}`)
      }
    }
  }
  return due.length
}
