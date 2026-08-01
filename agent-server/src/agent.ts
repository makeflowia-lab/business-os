import { query, type Query, type ModelInfo } from '@anthropic-ai/claude-agent-sdk'
import { PROJECT_ROOT, AGENT_TIMEOUT_MS } from './config.js'
import { logger } from './logger.js'

export type { Query, ModelInfo }

export interface AgentResult {
  text: string | null
  newSessionId?: string
  slashCommands?: string[]
  isCompact?: boolean
  tokensBefore?: number
  tokensAfter?: number
}

// ─── SSE Stream Events ────────────────────────────────────────────────────────

export type SSEEvent =
  | { type: 'init'; sessionId: string; slashCommands?: string[] }
  | { type: 'text_delta'; text: string }
  | { type: 'tool_start'; toolName: string; toolId: string }
  | { type: 'tool_done'; toolId: string }
  | { type: 'compact'; tokensBefore?: number; tokensAfter?: number }
  | { type: 'usage'; costUsd: number; inputTokens: number; outputTokens: number; durationMs: number; numTurns: number; model?: string }
  | { type: 'result'; text: string }
  | { type: 'model_changed'; model: string }
  | { type: 'interrupt' }
  | { type: 'error'; message: string }

/**
 * Streaming version of runAgent. Yields SSE events as the agent works.
 * Uses includePartialMessages to get real-time text + tool call visibility.
 */
export type EffortLevel = 'low' | 'medium' | 'high' | 'max'

export async function* runAgentStream(
  message: string,
  sessionId?: string,
  signal?: AbortSignal,
  effort?: EffortLevel,
  onQuery?: (q: Query) => void,
  cwd?: string,
): AsyncGenerator<SSEEvent> {
  const ac = new AbortController()
  const timeout = setTimeout(() => ac.abort(), AGENT_TIMEOUT_MS)

  // Link external signal to our abort controller
  if (signal) {
    signal.addEventListener('abort', () => ac.abort(), { once: true })
  }

  let resultText = ''
  let inTool = false
  let currentToolId: string | null = null

  try {
    const stream = query({
      prompt: message,
      options: {
        // cwd opcional: permite orquestar proyectos externos. settingSources se mantiene
        // ['project','user'] para que cargue CLAUDE.md + skills del proyecto destino.
        cwd: cwd ?? PROJECT_ROOT,
        resume: sessionId,
        settingSources: ['project', 'user'],
        permissionMode: 'bypassPermissions',
        abortController: ac,
        includePartialMessages: true,
        ...(effort && { effort }),
      },
    })

    // Expose Query object to caller for interrupt/setModel/etc.
    onQuery?.(stream)

    for await (const event of stream) {
      const e = event as Record<string, unknown>

      // System init
      if (e['type'] === 'system' && e['subtype'] === 'init') {
        yield {
          type: 'init',
          sessionId: e['session_id'] as string,
          slashCommands: e['slash_commands'] as string[] | undefined,
        }
      }

      // Compact boundary
      if (e['type'] === 'system' && e['subtype'] === 'compact_boundary') {
        const meta = e['compact_metadata'] as Record<string, unknown> | undefined
        yield {
          type: 'compact',
          tokensBefore: meta?.['pre_tokens'] as number | undefined,
          tokensAfter: meta?.['post_tokens'] as number | undefined,
        }
      }

      // Stream events (partial messages)
      if (e['type'] === 'stream_event') {
        const ev = e['event'] as Record<string, unknown>
        const evType = ev['type'] as string

        if (evType === 'content_block_start') {
          const block = ev['content_block'] as Record<string, unknown>
          if (block?.['type'] === 'tool_use') {
            const toolName = block['name'] as string
            const toolId = block['id'] as string
            inTool = true
            currentToolId = toolId
            yield { type: 'tool_start', toolName, toolId }
          }
        }

        if (evType === 'content_block_delta') {
          const delta = ev['delta'] as Record<string, unknown>
          if (delta?.['type'] === 'text_delta' && !inTool) {
            const text = delta['text'] as string
            resultText += text
            yield { type: 'text_delta', text }
          }
        }

        if (evType === 'content_block_stop') {
          if (inTool && currentToolId) {
            yield { type: 'tool_done', toolId: currentToolId }
            inTool = false
            currentToolId = null
          }
        }
      }

      // Result message with usage data
      if (e['type'] === 'result') {
        const raw = e['result']
        if (typeof raw === 'string') {
          resultText = raw
        } else if (raw && typeof raw === 'object' && 'result' in raw) {
          resultText = (raw as { result: string }).result
        }

        // Extract usage data from result message
        const costUsd = (e['total_cost_usd'] as number) ?? 0
        const usage = (e['usage'] as Record<string, number>) ?? {}
        const durationMs = (e['duration_ms'] as number) ?? 0
        const numTurns = (e['num_turns'] as number) ?? 0

        yield {
          type: 'usage',
          costUsd,
          inputTokens: usage['input_tokens'] ?? 0,
          outputTokens: usage['output_tokens'] ?? 0,
          durationMs,
          numTurns,
        }

        yield { type: 'result', text: resultText }
      }
    }
  } catch (err) {
    logger.error({ err }, 'runAgentStream error')
    const msg = String(err)
    if (ac.signal.aborted || msg.includes('abort')) {
      yield { type: 'error', message: 'Aborted.' }
    } else {
      yield { type: 'error', message: msg }
    }
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Spawns the real `claude` CLI as a subprocess via Agent SDK.
 *
 * Key: bypassPermissions = no approval prompts → the bot won't hang.
 * settingSources ['project','user'] = loads CLAUDE.md from this dir + global skills from ~/.claude/
 * resume = continues the previous session (native Claude Code conversation memory)
 */
export async function runAgent(
  message: string,
  sessionId?: string,
  onTyping?: () => void,
  cwd?: string,
  model?: string,
): Promise<AgentResult> {
  let resultText: string | null = null
  let newSessionId: string | undefined
  let slashCommands: string[] | undefined
  let isCompact = false
  let tokensBefore: number | undefined
  let tokensAfter: number | undefined

  const typingInterval = onTyping ? setInterval(onTyping, 4000) : null
  const ac = new AbortController()
  const timeout = setTimeout(() => ac.abort(), AGENT_TIMEOUT_MS)

  try {
    const stream = query({
      prompt: message,
      options: {
        // cwd opcional: cuando apunta a un proyecto externo, settingSources
        // ['project','user'] carga las skills/CLAUDE.md de ese proyecto.
        cwd: cwd ?? PROJECT_ROOT,
        resume: sessionId,
        settingSources: ['project', 'user'],
        permissionMode: 'bypassPermissions',
        abortController: ac,
        // model opcional: si no se pasa, el SDK usa el modelo default del CLI.
        ...(model && { model }),
      },
    })

    for await (const event of stream) {
      const e = event as Record<string, unknown>

      if (e['type'] === 'system' && e['subtype'] === 'init') {
        newSessionId = e['session_id'] as string | undefined
        slashCommands = e['slash_commands'] as string[] | undefined
      }

      if (e['type'] === 'system' && e['subtype'] === 'compact_boundary') {
        isCompact = true
        const meta = e['compact_metadata'] as Record<string, unknown> | undefined
        if (meta) {
          tokensBefore = meta['pre_tokens'] as number | undefined
          tokensAfter = meta['post_tokens'] as number | undefined
        }
      }

      if (e['type'] === 'result') {
        const raw = e['result']
        if (typeof raw === 'string') {
          resultText = raw
        } else if (raw && typeof raw === 'object' && 'result' in raw) {
          resultText = (raw as { result: string }).result
        }
      }
    }
  } catch (err) {
    logger.error({ err }, 'runAgent error')
    const msg = String(err)
    if (ac.signal.aborted || msg.includes('abort')) {
      throw new Error('Agent timed out. Try again with a shorter message or use /newchat.')
    }
    if (msg.includes('timeout') || msg.includes('Timeout')) {
      throw new Error('Response timed out. Try again.')
    }
    throw err
  } finally {
    clearTimeout(timeout)
    if (typingInterval) clearInterval(typingInterval)
  }

  logger.debug({ sessionId, newSessionId, length: resultText?.length, isCompact }, 'runAgent complete')
  return { text: resultText, newSessionId, slashCommands, isCompact, tokensBefore, tokensAfter }
}

/**
 * Get available models from the SDK. Creates a temporary query to call supportedModels(),
 * then immediately interrupts to avoid executing any prompt.
 */
export async function getAvailableModels(sessionId?: string): Promise<ModelInfo[]> {
  const ac = new AbortController()
  const timeout = setTimeout(() => ac.abort(), 30_000)

  try {
    const stream = query({
      prompt: '/status',
      options: {
        cwd: PROJECT_ROOT,
        ...(sessionId && { resume: sessionId }),
        settingSources: ['project', 'user'],
        permissionMode: 'bypassPermissions',
        abortController: ac,
      },
    })

    const models = await stream.supportedModels()
    await stream.interrupt()
    return models
  } catch (err) {
    logger.error({ err }, 'getAvailableModels error')
    return []
  } finally {
    clearTimeout(timeout)
  }
}
