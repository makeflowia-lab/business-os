#!/usr/bin/env node
/**
 * Siembra los cronjobs de automations/cronjobs-seed.json en el scheduler (SQLite).
 *
 * Uso:
 *   npx tsx scripts/seed-crons.ts             # siembra los enabled:true que no existan
 *   npx tsx scripts/seed-crons.ts --all       # incluye también los enabled:false
 *   npx tsx scripts/seed-crons.ts --replace   # reemplaza los existentes con el prompt del seed
 *   npx tsx scripts/seed-crons.ts --dry-run   # muestra qué haría sin tocar la BD
 *
 * Requiere ALLOWED_CHAT_ID en agent-server/.env (los resultados se envían a ese chat).
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { initDatabase, createTask, taskExists, deleteTask } from '../src/db.js'
import { computeNextRun } from '../src/scheduler.js'
import { ALLOWED_CHAT_ID, PROJECT_ROOT } from '../src/config.js'

interface SeedTask {
  id: string
  schedule: string
  enabled: boolean
  category?: string
  prompt: string
}

const args = process.argv.slice(2)
const INCLUDE_DISABLED = args.includes('--all')
const REPLACE = args.includes('--replace')
const DRY_RUN = args.includes('--dry-run')

const SEED_PATH = join(PROJECT_ROOT, '..', 'automations', 'cronjobs-seed.json')

if (!ALLOWED_CHAT_ID) {
  console.error('✗ ALLOWED_CHAT_ID no está definido en agent-server/.env')
  console.error('  Vincula tu Telegram primero (ver docs/SETUP_PROMPT.md) y vuelve a ejecutar.')
  process.exit(1)
}

let seed: { tasks: SeedTask[] }
try {
  seed = JSON.parse(readFileSync(SEED_PATH, 'utf-8'))
} catch (err) {
  console.error(`✗ No se pudo leer ${SEED_PATH}: ${String(err)}`)
  process.exit(1)
}

initDatabase()

let created = 0
let skipped = 0
let replaced = 0
let disabled = 0

for (const task of seed.tasks) {
  if (!task.enabled && !INCLUDE_DISABLED) {
    disabled++
    console.log(`⏸  ${task.id.padEnd(24)} omitido (enabled:false — usa --all para incluirlo)`)
    continue
  }

  let nextRun: number
  try {
    nextRun = computeNextRun(task.schedule)
  } catch {
    console.error(`✗ ${task.id}: expresión cron inválida "${task.schedule}" — omitido`)
    continue
  }

  const exists = taskExists(task.id)

  if (exists && !REPLACE) {
    skipped++
    console.log(`↷  ${task.id.padEnd(24)} ya existe (usa --replace para actualizarlo)`)
    continue
  }

  if (DRY_RUN) {
    console.log(`○  ${task.id.padEnd(24)} ${exists ? 'se reemplazaría' : 'se crearía'} [${task.schedule}]`)
    continue
  }

  if (exists && REPLACE) {
    deleteTask(task.id)
    replaced++
  } else {
    created++
  }

  createTask({
    id: task.id,
    chat_id: ALLOWED_CHAT_ID,
    thread_id: null,
    prompt: task.prompt,
    schedule: task.schedule,
    next_run: nextRun,
    status: 'active',
    created_at: Math.floor(Date.now() / 1000),
  })

  console.log(`✓  ${task.id.padEnd(24)} sembrado [${task.schedule}]`)
}

console.log('\n────────────────────────────────────────')
console.log(`Creados: ${created} · Reemplazados: ${replaced} · Ya existían: ${skipped} · Desactivados: ${disabled}`)
console.log('Verifica con: npx tsx src/schedule-cli.ts list')
