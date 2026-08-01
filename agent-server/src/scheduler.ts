import { createRequire } from 'module'
const _require = createRequire(import.meta.url)
// cron-parser is CJS — use createRequire for reliable interop
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { parseExpression } = _require('cron-parser') as any
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import {
  getDueTasks,
  getTask,
  updateTaskAfterRun,
  updateTaskAfterTransientError,
  rescheduleTask,
  listTasks,
  updateTaskStatus,
  type ScheduledTask,
} from './db.js'
import { runAgent } from './agent.js'
import { logger } from './logger.js'
import {
  PROJECT_ROOT,
  SCHEDULER_TZ,
  STARTUP_STAGGER_MINUTES,
  SCHEDULER_TASK_GAP_MS,
  SCHEDULER_RETRY_BASE_MINUTES,
  SCHEDULER_MAX_RETRIES,
  AGENT_MODEL,
} from './config.js'
import { mcCronResult } from './mc-client.js'

let schedulerInterval: ReturnType<typeof setInterval> | null = null

/** Tareas cuya ejecución sigue en curso — nunca deben relanzarse en el siguiente poll. */
const inFlight = new Set<string>()
/** Un solo poll a la vez: si el anterior sigue trabajando, el nuevo se descarta. */
let pollRunning = false

/** Tope duro del backoff, en minutos (15 → 30 → 60 → 60...). */
const RETRY_BACKOFF_CAP_MINUTES = 60

export function computeNextRun(cronExpression: string): number {
  const interval = parseExpression(cronExpression, { tz: SCHEDULER_TZ })
  return Math.floor(interval.next().getTime() / 1000)
}

// ============================================================
// ERRORES TRANSITORIOS
// ============================================================

/**
 * Un error transitorio (cuota, límite de sesión, rate limit, red) NO es una corrida
 * válida: el trabajo del cron no se hizo, así que el slot no debe consumirse.
 */
const TRANSIENT_MARKERS = [
  'limit', // cubre "reached your ... limit", "session limit", "rate limit", "usage limit"
  'rate limit',
  '429',
  'overloaded',
  'quota',
  'econnreset',
  'etimedout',
  'socket hang up',
]

export function isTransientError(err: unknown): boolean {
  const msg = (err instanceof Error ? `${err.message} ${String(err)}` : String(err)).toLowerCase()
  return TRANSIENT_MARKERS.some((marker) => msg.includes(marker))
}

/** Backoff exponencial a partir del nº de reintentos ya consumidos: 15 → 30 → 60, tope 60. */
function backoffMinutes(previousRetries: number): number {
  const base = SCHEDULER_RETRY_BASE_MINUTES > 0 ? SCHEDULER_RETRY_BASE_MINUTES : 15
  return Math.min(base * Math.pow(2, previousRetries), RETRY_BACKOFF_CAP_MINUTES)
}

// ============================================================
// POLL
// ============================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function fmtTime(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toISOString()
}

/**
 * computeNextRun puede lanzar si la expresión cron es inválida o si SCHEDULER_TZ
 * no es una zona IANA válida. Si eso ocurre sin red de seguridad, next_run nunca
 * avanza → la tarea sigue vencida → se re-ejecuta (y se gasta cuota) en CADA poll
 * de 60 s, para siempre, y además la excepción aborta el resto del poll.
 * Aquí se pausa la tarea y se registra el motivo.
 */
function safeNextRun(taskId: string, schedule: string): number {
  try {
    return computeNextRun(schedule)
  } catch (err) {
    updateTaskStatus(taskId, 'paused')
    logger.error(
      { err, taskId, schedule, tz: SCHEDULER_TZ },
      'invalid cron expression or SCHEDULER_TZ — task paused to avoid re-running every 60s'
    )
    return Math.floor(Date.now() / 1000) + 3600
  }
}

export async function runDueTasks(): Promise<void> {
  if (pollRunning) {
    logger.debug('scheduler poll already running — skipping this tick')
    return
  }
  pollRunning = true

  try {
    const tasks = getDueTasks()
    if (tasks.length === 0) return

    let launched = 0

    for (const task of tasks) {
      // GUARDIA DE CONCURRENCIA: la ejecución anterior todavía no terminó (next_run
      // no ha avanzado), así que la tarea volvería a salir como vencida. No relanzar.
      if (inFlight.has(task.id)) {
        logger.debug({ taskId: task.id }, 'task still in flight — skipping')
        continue
      }

      // Espaciado entre tareas del mismo poll: no spawnear varios Claude Code a la vez.
      if (launched > 0 && SCHEDULER_TASK_GAP_MS > 0) {
        await sleep(SCHEDULER_TASK_GAP_MS)
      }
      launched++

      await executeTask(task)
    }
  } finally {
    pollRunning = false
  }
}

/**
 * Ejecuta UNA tarea con la guardia de concurrencia y el manejo de errores
 * transitorios. Es el único camino que debe lanzar runAgent para un cron —
 * tanto el poll como las corridas manuales.
 */
async function executeTask(task: ScheduledTask): Promise<void> {
  inFlight.add(task.id)
  logger.info({ taskId: task.id, prompt: task.prompt.slice(0, 80) }, 'running scheduled task')

  try {
    const result = await runAgent(
      task.prompt,
      undefined,
      undefined,
      undefined,
      AGENT_MODEL || undefined
    )
    const text = result.text?.trim() ?? ''
    const nextRun = safeNextRun(task.id, task.schedule)

    // Enviar resultado a Mission Control
    mcCronResult(task.id, text || '(no output)')

    // Éxito → avanza al siguiente slot y resetea retry_count.
    updateTaskAfterRun(task.id, text || '(no output)', nextRun)
    logger.info({ taskId: task.id, nextRun }, 'task completed')
  } catch (err) {
    handleTaskError(task.id, task.schedule, task.retry_count ?? 0, err)
  } finally {
    inFlight.delete(task.id)
  }
}

/** ¿La tarea está ejecutándose ahora mismo? Usado por el endpoint de run manual. */
export function isTaskInFlight(taskId: string): boolean {
  return inFlight.has(taskId)
}

/**
 * Corrida manual (Mission Control / CLI). Comparte la guardia de concurrencia y el
 * manejo de errores transitorios del scheduler: nunca duplica una tarea en vuelo y
 * un error de cuota no consume el slot del cron.
 */
export async function runTaskNow(taskId: string): Promise<'ran' | 'in-flight' | 'not-found'> {
  const task = getTask(taskId)
  if (!task) return 'not-found'
  // Comprobación síncrona antes del primer await: no hay ventana de carrera.
  if (inFlight.has(taskId)) return 'in-flight'
  await executeTask(task)
  return 'ran'
}

function handleTaskError(
  taskId: string,
  schedule: string,
  previousRetries: number,
  err: unknown
): void {
  const transient = isTransientError(err)
  mcCronResult(taskId, '', String(err))

  if (transient && previousRetries < SCHEDULER_MAX_RETRIES) {
    const attempt = previousRetries + 1
    const delayMin = backoffMinutes(previousRetries)
    const nextRun = Math.floor(Date.now() / 1000) + Math.round(delayMin * 60)

    // NO se avanza al siguiente slot del cron: el trabajo sigue pendiente.
    updateTaskAfterTransientError(
      taskId,
      `Transient error (retry ${attempt}/${SCHEDULER_MAX_RETRIES}): ${String(err)}`,
      nextRun,
      attempt
    )
    logger.warn(
      { taskId, delayMin, attempt, maxRetries: SCHEDULER_MAX_RETRIES, nextRun, err },
      `transient error, retrying in ${delayMin} min (intento ${attempt}/${SCHEDULER_MAX_RETRIES})`
    )
    return
  }

  // Error definitivo (o reintentos agotados) → se consume el slot con el error registrado.
  const nextRun = safeNextRun(taskId, schedule)
  const prefix = transient
    ? `Transient error, retries exhausted (${previousRetries}/${SCHEDULER_MAX_RETRIES})`
    : 'Error'
  updateTaskAfterRun(taskId, `${prefix}: ${String(err)}`, nextRun)
  logger.error(
    { err, taskId, nextRun, transient, retries: previousRetries },
    transient
      ? 'transient error, retries exhausted — advancing to next slot'
      : 'scheduled task error'
  )
}

// ============================================================
// ARRANQUE
// ============================================================

/**
 * ANTI-ESTAMPIDA: tras un reinicio (o tras horas apagado) todos los crons vencidos
 * saldrían a la vez y dispararían N Claude Code en paralelo. En vez de eso los
 * escalonamos cada STARTUP_STAGGER_MINUTES a partir de ahora.
 */
function staggerOverdueTasks(): void {
  const overdue = getDueTasks()
  if (overdue.length <= 1) return

  const gapSeconds = Math.round(STARTUP_STAGGER_MINUTES * 60)
  if (gapSeconds <= 0) return

  const now = Math.floor(Date.now() / 1000)

  overdue.forEach((task, index) => {
    const nextRun = now + index * gapSeconds
    if (index > 0) rescheduleTask(task.id, nextRun)
    logger.info({ taskId: task.id, nextRun, at: fmtTime(nextRun) }, 'overdue task staggered')
  })

  logger.warn(
    { count: overdue.length, staggerMinutes: STARTUP_STAGGER_MINUTES },
    `startup: ${overdue.length} overdue tasks staggered ${STARTUP_STAGGER_MINUTES} min apart`
  )
}

/**
 * AVISO DE SISTEMA APAGADO: si la capa de contexto sigue siendo la plantilla
 * ({{ASI...}} sin rellenar), los crons de negocio correrán sin contexto y gastarán
 * cuota. Solo se avisa — no se cambia el status de ninguna tarea.
 */
function warnIfContextNotOnboarded(): void {
  try {
    const empresaPath = join(PROJECT_ROOT, '..', 'context', '00_EMPRESA.md')
    if (!existsSync(empresaPath)) return
    if (!readFileSync(empresaPath, 'utf-8').includes('{{ASI')) return

    const activeCount = listTasks().filter((t) => t.status === 'active').length
    if (activeCount === 0) return

    logger.warn(
      { activeTasks: activeCount, contextFile: empresaPath },
      `onboarding incompleto: context/00_EMPRESA.md sigue con marcadores {{ASI}} y hay ${activeCount} cron(s) activos. ` +
        'Correrán con contexto vacío y consumirán cuota. Recomendación: mantenlos pausados hasta completar la skill onboarding-empresa.'
    )
  } catch (err) {
    logger.debug({ err }, 'context onboarding check skipped')
  }
}

export function initScheduler(): void {
  // NOTA: aquí ya no se siembran crons de ejemplo. Los cronjobs reales del negocio
  // viven en automations/cronjobs-seed.json y se siembran a mano con:
  //   npx tsx scripts/seed-crons.ts
  // Sembrar desde el arranque re-creaba tareas que el usuario había borrado.

  warnIfContextNotOnboarded()
  staggerOverdueTasks()

  // Poll every 60 seconds
  schedulerInterval = setInterval(() => {
    runDueTasks().catch((err) => logger.error({ err }, 'scheduler poll error'))
  }, 60_000)

  logger.info('scheduler started')
}

export function stopScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval)
    schedulerInterval = null
  }
}
