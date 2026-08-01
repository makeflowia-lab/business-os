/**
 * Mission Control Web Server — exposes a local HTTP endpoint so Mission Control
 * dashboard can send messages to the Agent (Claude Code Agent SDK) from the browser.
 *
 * Endpoints:
 *   POST /chat            { message: string, project?: string } → { text: string }
 *   POST /chat/stream     { message: string, project?: string } → SSE stream
 *   POST /chat/interrupt  { project?: string }                  → gracefully stop active query
 *   POST /newchat         {}                  → { ok: true }
 *   GET  /commands         → available slash commands
 *   GET  /models           → available AI models
 *   GET  /projects         → configured orchestration projects (name + path)
 *   GET  /usage?days=30    → usage summary (tokens, cost)
 *   GET  /schedule         → list cron jobs
 *   POST /schedule/:id/:action → run/pause/resume a cron job
 *
 * Multi-project: "project" opcional en /chat, /chat/stream y /chat/interrupt.
 * Si se envía y está en AGENT_PROJECTS, la sesión corre con cwd = ruta del proyecto
 * y session key "web:<project>" (aislada de "mc-web"). Si no está en la whitelist → 400.
 *
 * Auth: Bearer token (OPENCLAW_GATEWAY_TOKEN)
 * Port: MC_SERVER_PORT env var, default 3099
 */

import { createServer, IncomingMessage, ServerResponse } from 'http'
import { timingSafeEqual } from 'crypto'
import { readEnvFile } from './env.js'
import { PROJECT_ROOT, AGENT_PROJECTS } from './config.js'
import { runAgent, runAgentStream, getAvailableModels, EffortLevel, type Query } from './agent.js'
import { getSession, setSession, clearSession, listTasks, getTask, updateTaskStatus, updateTaskAfterRun, saveQueryUsage, getUsageSummary } from './db.js'
import { computeNextRun, runDueTasks, isTaskInFlight, runTaskNow } from './scheduler.js'
import { buildMemoryContext, saveConversationTurn } from './memory.js'
import { logger } from './logger.js'

const env = readEnvFile(['OPENCLAW_GATEWAY_TOKEN', 'MC_SERVER_PORT', 'MISSION_CONTROL_ORIGIN'])
const MC_TOKEN = env['OPENCLAW_GATEWAY_TOKEN'] ?? ''
const PORT = parseInt(env['MC_SERVER_PORT'] ?? '3099', 10)
const ALLOWED_ORIGIN = env['MISSION_CONTROL_ORIGIN'] ?? 'http://localhost:3000'

if (!MC_TOKEN) {
  console.error(
    '⚠ OPENCLAW_GATEWAY_TOKEN no está definido en .env: el gateway HTTP rechazará\n' +
      '  todas las peticiones. El bot de Telegram funciona igual; esto solo afecta a\n' +
      '  Mission Control. Genera un valor cualquiera y ponlo en ambos .env para usarlo.',
  )
}

function isTokenValid(provided: string): boolean {
  if (!MC_TOKEN) return false
  if (provided.length !== MC_TOKEN.length) return false
  return timingSafeEqual(Buffer.from(provided), Buffer.from(MC_TOKEN))
}

// Separate session key for web chat (different from Telegram session)
const SESSION_KEY = 'mc-web'

// Active queries per session key — chats de proyectos distintos no se bloquean entre sí
const activeQueries = new Map<string, Query>()

// ─── Multi-project helpers ───────────────────────────────────────────────────

interface ProjectContext {
  /** Session key: 'mc-web' (default) o 'web:<project>' */
  sessionKey: string
  /** cwd del proyecto externo; undefined → PROJECT_ROOT (comportamiento actual) */
  cwd?: string
  /** Nombre del proyecto si se especificó */
  project?: string
}

/**
 * Resuelve el campo opcional "project" del body contra la whitelist AGENT_PROJECTS.
 * Retorna null si el proyecto no es válido (el caller responde 400).
 * Sin "project" → contexto default (idéntico al comportamiento previo).
 */
function resolveProjectContext(parsed: Record<string, unknown>): ProjectContext | null {
  const project = typeof parsed['project'] === 'string' ? parsed['project'].trim() : ''
  if (!project) {
    return { sessionKey: SESSION_KEY }
  }
  const cwd = AGENT_PROJECTS[project]
  if (!cwd) return null
  return { sessionKey: `web:${project}`, cwd, project }
}

function sendInvalidProject(res: ServerResponse): void {
  sendJSON(res, 400, {
    error: 'Unknown project',
    validProjects: Object.keys(AGENT_PROJECTS),
  })
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function setCORSHeaders(res: ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN)
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
}

function sendJSON(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks).toString()))
  })
}

// ─── Request handler ─────────────────────────────────────────────────────────

async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  setCORSHeaders(res)

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  // Auth
  const token = (req.headers['authorization'] ?? '').replace('Bearer ', '')
  if (!isTokenValid(token)) {
    sendJSON(res, 401, { error: 'Unauthorized' })
    return
  }

  const body = await readBody(req)
  let parsed: Record<string, unknown> = {}
  try { parsed = JSON.parse(body) } catch { /* ignore */ }

  // GET /models — return available models (hardcoded + SDK fallback)
  if (req.method === 'GET' && req.url === '/models') {
    const MODELS = [
      { value: 'claude-opus-4-6',           displayName: 'Opus 4.6',   description: 'Most capable. Agents and code.',    supportsEffort: true },
      { value: 'claude-sonnet-4-6',         displayName: 'Sonnet 4.6', description: 'Balance of speed + intelligence.', supportsEffort: true },
      { value: 'claude-haiku-4-5-20251001', displayName: 'Haiku 4.5',  description: 'Fastest. Light tasks.',            supportsEffort: true },
    ]

    // Try SDK models first, fallback to hardcoded
    try {
      const sessionId = getSession(SESSION_KEY)
      const sdkModels = await getAvailableModels(sessionId)
      sendJSON(res, 200, { models: sdkModels.length > 0 ? sdkModels : MODELS })
    } catch {
      sendJSON(res, 200, { models: MODELS })
    }
    return
  }

  // POST /chat/interrupt — gracefully interrupt the active query
  // Acepta "project" opcional para interrumpir solo la sesión de ese proyecto.
  if (req.method === 'POST' && req.url === '/chat/interrupt') {
    const ctx = resolveProjectContext(parsed)
    if (!ctx) {
      sendInvalidProject(res)
      return
    }
    const activeQuery = activeQueries.get(ctx.sessionKey)
    if (activeQuery) {
      try {
        await activeQuery.interrupt()
        activeQueries.delete(ctx.sessionKey)
        sendJSON(res, 200, { ok: true })
      } catch (err) {
        logger.error({ err, sessionKey: ctx.sessionKey }, 'interrupt error')
        activeQueries.delete(ctx.sessionKey)
        sendJSON(res, 200, { ok: true, message: 'Interrupt attempted' })
      }
    } else {
      sendJSON(res, 200, { ok: true, message: 'No active query' })
    }
    return
  }

  // GET /projects — configured orchestration projects (misma auth Bearer del gateway)
  if (req.method === 'GET' && req.url === '/projects') {
    sendJSON(res, 200, {
      projects: Object.entries(AGENT_PROJECTS).map(([name, path]) => ({ name, path })),
    })
    return
  }

  // GET /commands — return available slash commands
  if (req.method === 'GET' && req.url === '/commands') {
    sendJSON(res, 200, {
      commands: [
        { name: '/clear',   description: 'New conversation — clear history' },
        { name: '/compact', description: 'Compress context (reduce token usage)' },
        { name: '/status',  description: 'Agent status: model, active tasks, session' },
        { name: '/tasks',   description: 'Current tasks on the Kanban board' },
        { name: '/agents',  description: 'Live status of all agents' },
        { name: '/context', description: 'Current context usage (tokens)' },
        { name: '/model',   description: 'Switch AI model' },
        { name: '/help',    description: 'Show all available commands' },
      ],
    })
    return
  }

  // POST /newchat — reset Claude Code session
  if (req.method === 'POST' && req.url === '/newchat') {
    clearSession(SESSION_KEY)
    sendJSON(res, 200, { ok: true })
    return
  }

  // POST /chat/stream — SSE streaming endpoint for real-time chat
  if (req.method === 'POST' && req.url === '/chat/stream') {
    const message = typeof parsed['message'] === 'string' ? parsed['message'].trim() : ''
    if (!message) {
      sendJSON(res, 400, { error: 'message required' })
      return
    }

    // Multi-project: "project" opcional → cwd + session key propios
    const ctx = resolveProjectContext(parsed)
    if (!ctx) {
      sendInvalidProject(res)
      return
    }
    const sessionKey = ctx.sessionKey

    // Intercept /model <name> — change model without sending to agent
    const modelMatch = message.match(/^\/model\s+(.+)$/i)
    if (modelMatch) {
      const modelName = modelMatch[1].trim()
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      })

      try {
        const sessionId = getSession(sessionKey)
        const { query: sdkQuery } = await import('@anthropic-ai/claude-agent-sdk')
        const stream = sdkQuery({
          prompt: '/status',
          options: {
            cwd: ctx.cwd ?? PROJECT_ROOT,
            ...(sessionId && { resume: sessionId }),
            settingSources: ['project', 'user'],
            permissionMode: 'bypassPermissions',
          },
        })
        await stream.setModel(modelName)
        await stream.interrupt()
        res.write(`data: ${JSON.stringify({ type: 'model_changed', model: modelName })}\n\n`)
      } catch (err) {
        logger.error({ err }, 'setModel error')
        res.write(`data: ${JSON.stringify({ type: 'error', message: `Failed to switch model: ${String(err)}` })}\n\n`)
      } finally {
        res.write('data: [DONE]\n\n')
        res.end()
      }
      return
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    })

    let myQuery: Query | null = null
    const ac = new AbortController()
    // Graceful interrupt on client disconnect, fallback to abort
    req.on('close', () => {
      if (myQuery) {
        myQuery.interrupt().catch(() => ac.abort())
      } else {
        ac.abort()
      }
    })

    try {
      const sessionId = getSession(sessionKey)
      const memCtx = await buildMemoryContext(sessionKey, message)
      const fullMessage = memCtx ? `${memCtx}\n\n${message}` : message

      const effort = typeof parsed['effort'] === 'string'
        ? (['low', 'medium', 'high', 'max'].includes(parsed['effort']) ? parsed['effort'] as EffortLevel : undefined)
        : undefined

      let newSessionId: string | undefined
      let resultText = ''

      for await (const event of runAgentStream(fullMessage, sessionId, ac.signal, effort, (q) => {
        myQuery = q
        activeQueries.set(sessionKey, q)
      }, ctx.cwd)) {
        if (ac.signal.aborted) break

        // Capture session ID for persistence
        if (event.type === 'init') {
          newSessionId = event.sessionId
        }
        if (event.type === 'result') {
          resultText = event.text
        }

        // Save usage data to SQLite
        if (event.type === 'usage') {
          saveQueryUsage({
            sessionKey,
            costUsd: event.costUsd,
            inputTokens: event.inputTokens,
            outputTokens: event.outputTokens,
            durationMs: event.durationMs,
            numTurns: event.numTurns,
          })
        }

        res.write(`data: ${JSON.stringify(event)}\n\n`)
      }

      // Persist session and memory
      if (newSessionId) setSession(sessionKey, newSessionId)
      if (resultText.trim()) {
        await saveConversationTurn(sessionKey, message, resultText.trim())
      }
    } catch (err) {
      logger.error({ err, sessionKey }, 'server /chat/stream error')
      res.write(`data: ${JSON.stringify({ type: 'error', message: String(err) })}\n\n`)
    } finally {
      // Solo limpiar si el query del mapa sigue siendo el de este request
      if (myQuery && activeQueries.get(sessionKey) === myQuery) {
        activeQueries.delete(sessionKey)
      }
      res.write('data: [DONE]\n\n')
      res.end()
    }
    return
  }

  // POST /chat — run agent and return response (non-streaming)
  if (req.method === 'POST' && req.url === '/chat') {
    const message = typeof parsed['message'] === 'string' ? parsed['message'].trim() : ''
    if (!message) {
      sendJSON(res, 400, { error: 'message required' })
      return
    }

    // Multi-project: "project" opcional → cwd + session key propios
    const ctx = resolveProjectContext(parsed)
    if (!ctx) {
      sendInvalidProject(res)
      return
    }
    const sessionKey = ctx.sessionKey

    try {
      const sessionId = getSession(sessionKey)
      const memCtx = await buildMemoryContext(sessionKey, message)
      const fullMessage = memCtx ? `${memCtx}\n\n${message}` : message

      const result = await runAgent(fullMessage, sessionId, undefined, ctx.cwd)

      if (result.newSessionId) {
        setSession(sessionKey, result.newSessionId)
      }

      const responseText = result.text?.trim() ?? ''
      if (responseText) {
        await saveConversationTurn(sessionKey, message, responseText)
      }

      sendJSON(res, 200, {
        text: responseText,
        ...(result.slashCommands && { slashCommands: result.slashCommands }),
        ...(result.isCompact && {
          compact: {
            tokensBefore: result.tokensBefore,
            tokensAfter: result.tokensAfter,
          },
        }),
      })
    } catch (err) {
      logger.error({ err }, 'server /chat error')
      sendJSON(res, 500, { error: String(err) })
    }
    return
  }

  // GET /usage — usage summary (tokens, cost, queries)
  if (req.method === 'GET' && req.url?.startsWith('/usage')) {
    const url = new URL(req.url, `http://localhost:${PORT}`)
    const days = parseInt(url.searchParams.get('days') ?? '30', 10)
    const sinceMs = Date.now() - 86_400_000 * days
    sendJSON(res, 200, getUsageSummary(sinceMs))
    return
  }

  // GET /schedule — list all cron jobs
  if (req.method === 'GET' && req.url === '/schedule') {
    sendJSON(res, 200, { tasks: listTasks() })
    return
  }

  // POST /schedule/:id/:action — run/pause/resume a cron job
  const scheduleMatch = req.url?.match(/^\/schedule\/([^/]+)\/(run|pause|resume)$/)
  if (req.method === 'POST' && scheduleMatch) {
    const [, taskId, action] = scheduleMatch
    const task = getTask(taskId)
    if (!task) {
      sendJSON(res, 404, { error: `Task "${taskId}" not found` })
      return
    }

    if (action === 'pause') {
      updateTaskStatus(taskId, 'paused')
      sendJSON(res, 200, { ok: true })
      return
    }

    if (action === 'resume') {
      const nextRun = computeNextRun(task.schedule)
      updateTaskStatus(taskId, 'active')
      updateTaskAfterRun(taskId, task.last_result ?? '', nextRun)
      sendJSON(res, 200, { ok: true, nextRun })
      return
    }

    // action === 'run' — execute async, return 202 immediately.
    // Pasa por runTaskNow para compartir la guardia de concurrencia del scheduler,
    // AGENT_MODEL y el backoff de errores transitorios (un error de cuota NO consume el slot).
    if (isTaskInFlight(taskId)) {
      sendJSON(res, 409, { error: `Task "${taskId}" is already running` })
      return
    }
    sendJSON(res, 202, { ok: true, message: `Task "${taskId}" queued for execution` })
    runTaskNow(taskId)
      .then((outcome) => logger.info({ taskId, outcome }, 'manual run finished'))
      .catch((err) => logger.error({ err, taskId }, 'manual run error'))
    return
  }

  sendJSON(res, 404, { error: 'Not found' })
}

// ─── Start server ─────────────────────────────────────────────────────────────

export function startMCServer(): void {
  const server = createServer((req, res) => {
    handleRequest(req, res).catch((err) => {
      logger.error({ err }, 'server unhandled error')
      try {
        sendJSON(res, 500, { error: 'Internal server error' })
      } catch { /* headers already sent */ }
    })
  })

  server.listen(PORT, '127.0.0.1', () => {
    logger.info({ port: PORT }, 'MC web server listening on localhost')
    console.log(`✓ MC server on http://localhost:${PORT}`)
  })
}
