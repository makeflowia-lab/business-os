/**
 * Puente con Claude (Agent SDK). Corre localmente con la sesión de Claude Code —
 * no requiere API key. Cada llamada es un razonamiento aislado sobre el Brain.
 */
import { query } from '@anthropic-ai/claude-agent-sdk'

const NO_TOOLS = ['Bash', 'Edit', 'Write', 'Read', 'Glob', 'Grep', 'WebFetch', 'WebSearch', 'Task', 'NotebookEdit', 'TodoWrite', 'Agent']

export async function askClaude(prompt: string, timeoutMs = 420_000): Promise<string> {
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), timeoutMs)
  try {
    const stream = query({
      prompt,
      options: {
        cwd: process.cwd(),
        settingSources: [],
        permissionMode: 'bypassPermissions',
        disallowedTools: NO_TOOLS,
        maxTurns: 2,
        abortController: ac,
      },
    })
    let text = ''
    for await (const event of stream) {
      const e = event as Record<string, unknown>
      if (e['type'] === 'result') {
        const raw = e['result']
        if (typeof raw === 'string') text = raw
        else if (raw && typeof raw === 'object' && 'result' in raw) text = (raw as { result: string }).result
      }
    }
    if (!text.trim()) throw new Error('Claude no devolvió respuesta')
    return text
  } finally {
    clearTimeout(timer)
  }
}

/** Pide JSON estricto y lo parsea con tolerancia a fences y texto alrededor. */
export async function askClaudeJSON<T>(prompt: string, timeoutMs?: number): Promise<T> {
  const raw = await askClaude(
    `${prompt}\n\nIMPORTANTE: Responde ÚNICAMENTE con el objeto JSON válido, sin markdown, sin \`\`\`, sin texto antes o después. No uses herramientas.`,
    timeoutMs,
  )
  return extractJSON<T>(raw)
}

/**
 * Extracción multimodal: Claude LEE un archivo local (PDF, imagen, texto) con su
 * herramienta Read y devuelve el contenido como texto. Único caso con tools.
 */
export async function askClaudeReadFile(filePath: string, instruccion: string, timeoutMs = 420_000): Promise<string> {
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), timeoutMs)
  try {
    const stream = query({
      prompt: `${instruccion}\n\nARCHIVO A LEER (usa tu herramienta Read, pagina si es largo): ${filePath}\n\nResponde SOLO con el contenido extraído en texto plano, sin comentarios tuyos.`,
      options: {
        cwd: process.cwd(),
        settingSources: [],
        permissionMode: 'bypassPermissions',
        disallowedTools: NO_TOOLS.filter((t) => t !== 'Read'),
        maxTurns: 12,
        abortController: ac,
      },
    })
    let text = ''
    for await (const event of stream) {
      const e = event as Record<string, unknown>
      if (e['type'] === 'result') {
        const raw = e['result']
        if (typeof raw === 'string') text = raw
        else if (raw && typeof raw === 'object' && 'result' in raw) text = (raw as { result: string }).result
      }
    }
    if (!text.trim()) throw new Error('No se pudo extraer contenido del archivo')
    return text
  } finally {
    clearTimeout(timer)
  }
}

export function extractJSON<T>(raw: string): T {
  const cleaned = raw.replace(/```(?:json)?/g, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`No se encontró JSON en la respuesta: ${cleaned.slice(0, 200)}`)
  }
  return JSON.parse(cleaned.slice(start, end + 1)) as T
}
