import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'
import { readEnvFile } from './env.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export const PROJECT_ROOT = join(__dirname, '..')
export const STORE_DIR = join(PROJECT_ROOT, 'store')
export const UPLOADS_DIR = join(PROJECT_ROOT, 'workspace', 'uploads')

const env = readEnvFile()

// === TELEGRAM ===
export const TELEGRAM_BOT_TOKEN = env['TELEGRAM_BOT_TOKEN'] ?? ''
export const ALLOWED_CHAT_ID = env['ALLOWED_CHAT_ID'] ?? ''
export const TELEGRAM_GROUP_ID = env['TELEGRAM_GROUP_ID'] ?? ''

// === VOICE ===
export const GROQ_API_KEY = env['GROQ_API_KEY'] ?? ''
export const ELEVENLABS_API_KEY = env['ELEVENLABS_API_KEY'] ?? ''
export const ELEVENLABS_VOICE_ID = env['ELEVENLABS_VOICE_ID'] ?? ''

// === ANALYTICS (optional Supabase for business metrics) ===
export const ANALYTICS_SUPABASE_URL = env['ANALYTICS_SUPABASE_URL'] ?? ''
export const ANALYTICS_SUPABASE_KEY = env['ANALYTICS_SUPABASE_KEY'] ?? ''

// === MULTI-PROJECT ORCHESTRATION ===
// AGENT_PROJECTS: JSON string (una línea) con mapa nombre → ruta absoluta.
// Define tus propios proyectos en agent-server/.env, por ejemplo:
//   AGENT_PROJECTS={"socialflow":"C:\\ruta\\a\\tu\\proyecto","crm":"C:\\ruta\\a\\otro"}
// Sin esta variable el agente funciona igual que siempre, sin proyectos orquestables.
// Rutas inexistentes se descartan con warning (nunca tumban el arranque).
const DEFAULT_AGENT_PROJECTS: Record<string, string> = {}

function parseAgentProjects(raw: string | undefined): Record<string, string> {
  let candidate: Record<string, string> = DEFAULT_AGENT_PROJECTS

  if (raw && raw.trim()) {
    try {
      const parsed: unknown = JSON.parse(raw)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const map: Record<string, string> = {}
        for (const [name, path] of Object.entries(parsed as Record<string, unknown>)) {
          if (typeof path === 'string' && path.trim()) {
            map[name] = path
          } else {
            console.error(`AGENT_PROJECTS: value for "${name}" is not a non-empty string — skipping`)
          }
        }
        candidate = map
      } else {
        console.error('AGENT_PROJECTS must be a JSON object (name → absolute path). Falling back to defaults.')
      }
    } catch (err) {
      console.error(`AGENT_PROJECTS is not valid JSON — falling back to defaults. ${String(err)}`)
    }
  }

  // Validación: solo rutas que existen en disco
  const valid: Record<string, string> = {}
  for (const [name, path] of Object.entries(candidate)) {
    if (existsSync(path)) {
      valid[name] = path
    } else {
      console.error(`AGENT_PROJECTS: path for project "${name}" does not exist — skipping: ${path}`)
    }
  }
  return valid
}

export const AGENT_PROJECTS: Record<string, string> = parseAgentProjects(
  env['AGENT_PROJECTS'] ?? process.env['AGENT_PROJECTS']
)

// === SCHEDULER ===
// Todas leen primero de .env y, si no está, de process.env (compatibilidad hacia atrás).
function envValue(key: string): string | undefined {
  const raw = env[key] ?? process.env[key]
  return raw && raw.trim() ? raw.trim() : undefined
}

function envNumber(key: string, fallback: number): number {
  const raw = envValue(key)
  if (raw === undefined) return fallback
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 0) {
    console.error(`${key} must be a non-negative number — using default ${fallback}`)
    return fallback
  }
  return n
}

export const SCHEDULER_TZ = envValue('SCHEDULER_TZ') ?? 'UTC'
// Minutos de separación entre tareas vencidas re-programadas al arrancar (anti-estampida).
export const STARTUP_STAGGER_MINUTES = envNumber('STARTUP_STAGGER_MINUTES', 3)
// Espaciado entre tareas dentro de un mismo poll (evita spawnear varios Claude Code a la vez).
export const SCHEDULER_TASK_GAP_MS = envNumber('SCHEDULER_TASK_GAP_MS', 2000)
// Backoff para errores transitorios (cuota/límite/red): 15 → 30 → 60 min, tope 60.
export const SCHEDULER_RETRY_BASE_MINUTES = envNumber('SCHEDULER_RETRY_BASE_MINUTES', 15)
export const SCHEDULER_MAX_RETRIES = envNumber('SCHEDULER_MAX_RETRIES', 3)

// === AGENT ===
// Modelo opcional para las corridas del scheduler. Vacío = default del CLI (comportamiento actual).
export const AGENT_MODEL = envValue('AGENT_MODEL') ?? ''

// === MISC ===
export const MAX_MESSAGE_LENGTH = 4096
export const TYPING_REFRESH_MS = 4000
export const AGENT_TIMEOUT_MS = 600_000  // 10 minutos máximo por query
