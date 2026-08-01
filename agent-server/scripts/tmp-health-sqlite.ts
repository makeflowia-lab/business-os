// Chequeo temporal: últimos resultados de crons y uso — borrar tras el health check
import Database from 'better-sqlite3'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = path.dirname(fileURLToPath(import.meta.url))
const db = new Database(path.join(dir, '..', 'store', 'agent-server.db'), {
  readonly: true,
})

const tasks = db
  .prepare(
    `SELECT id, status, schedule, last_run, next_run,
            substr(coalesce(last_result, ''), 1, 160) AS result
     FROM scheduled_tasks ORDER BY last_run DESC`
  )
  .all()
console.log('TASKS', JSON.stringify(tasks, null, 1))

const usage = db
  .prepare(
    `SELECT created_at, round(cost_usd, 4) AS cost, num_turns, duration_ms
     FROM query_usage ORDER BY created_at DESC LIMIT 5`
  )
  .all()
console.log('USAGE', JSON.stringify(usage, null, 1))
