/**
 * Cron Jobs del Business OS. Cada schedule guarda una INSTRUCCIÓN en lenguaje
 * natural que el Instruction Router ejecuta cuando toca (reportes, sync de
 * Gmail, análisis, recordatorios…). El tick corre dentro del proceso del bot.
 */
import parser from 'cron-parser'
import { q } from './db'
import { recordMemory } from './brain'

export interface Schedule {
  id: string; nombre: string; cron: string; instruccion: string
  activo: boolean; last_run: Date | null; last_result: string | null; next_run: Date | null
}

export function computeNextRun(cron: string): Date {
  return parser.parseExpression(cron, { tz: process.env.SCHEDULER_TZ || Intl.DateTimeFormat().resolvedOptions().timeZone }).next().toDate()
}

export async function listSchedules(): Promise<Schedule[]> {
  return q<Schedule>(`SELECT * FROM bo_schedules ORDER BY created_at DESC LIMIT 100`)
}

export async function createSchedule(nombre: string, cron: string, instruccion: string): Promise<Schedule> {
  const nextRun = computeNextRun(cron) // valida la expresión
  const [row] = await q<Schedule>(
    `INSERT INTO bo_schedules (nombre, cron, instruccion, next_run) VALUES ($1, $2, $3, $4) RETURNING *`,
    [nombre, cron, instruccion, nextRun],
  )
  await recordMemory('evento', `Cron programado: ${nombre}`, `${cron} → ${instruccion.slice(0, 150)}`, row.id)
  return row
}

export async function setScheduleActive(id: string, activo: boolean): Promise<void> {
  if (activo) {
    const [s] = await q<{ cron: string }>(`SELECT cron FROM bo_schedules WHERE id = $1`, [id])
    if (!s) throw new Error('Schedule no encontrado')
    await q(`UPDATE bo_schedules SET activo = true, next_run = $2 WHERE id = $1`, [id, computeNextRun(s.cron)])
  } else {
    await q(`UPDATE bo_schedules SET activo = false WHERE id = $1`, [id])
  }
}

export async function deleteSchedule(id: string): Promise<void> {
  await q(`DELETE FROM bo_schedules WHERE id = $1`, [id])
}

/**
 * Ejecuta los schedules vencidos. `execute` es el runner (Instruction Router)
 * y `notify` avisa al dueño (Telegram). Devuelve cuántos corrieron.
 */
export async function runDueSchedules(
  execute: (instruccion: string) => Promise<string>,
  notify: (text: string) => Promise<void>,
): Promise<number> {
  const due = await q<Schedule>(
    `SELECT * FROM bo_schedules WHERE activo AND next_run IS NOT NULL AND next_run <= now() ORDER BY next_run ASC LIMIT 5`,
  )
  for (const s of due) {
    // Reprogramar ANTES de ejecutar: si la ejecución tarda o falla, no se repite en loop
    await q(`UPDATE bo_schedules SET next_run = $2, last_run = now() WHERE id = $1`, [s.id, computeNextRun(s.cron)])
    try {
      const result = await execute(s.instruccion)
      await q(`UPDATE bo_schedules SET last_result = $2, fail_count = 0 WHERE id = $1`, [s.id, result.slice(0, 2000)])
      await recordMemory('accion', `Cron ejecutado: ${s.nombre}`, result.slice(0, 250), s.id)
      await notify(`⏰ ${s.nombre}\n\n${result}`)
    } catch (err) {
      const msg = `Error: ${String(err).slice(0, 500)}`
      const [row] = await q<{ fail_count: number }>(
        `UPDATE bo_schedules SET last_result = $2, fail_count = fail_count + 1 WHERE id = $1 RETURNING fail_count`,
        [s.id, msg],
      )
      // Observabilidad: 3 fallos consecutivos → auto-pausa + aviso (nada falla en silencio)
      if ((row?.fail_count ?? 0) >= 3) {
        await q(`UPDATE bo_schedules SET activo = false WHERE id = $1`, [s.id])
        await recordMemory('evento', `Cron auto-pausado por fallos: ${s.nombre}`, msg, s.id)
        await notify(`🛑 "${s.nombre}" falló 3 veces seguidas y lo PAUSÉ para no insistir en vano.\nÚltimo error: ${msg}\nRevísalo y reactívalo con /tareas → /reanudar.`)
      } else {
        await notify(`⏰⚠️ ${s.nombre} falló (${row?.fail_count ?? 1}/3): ${msg}`)
      }
    }
  }
  return due.length
}
