/**
 * generate-image.ts — Generate or edit images via OpenRouter (Gemini image models).
 *
 * Usage:
 *   npx tsx scripts/generate-image.ts --prompt "A cat in space"
 *   npx tsx scripts/generate-image.ts --prompt "Make it blue" --image /path/to/input.png
 *   npx tsx scripts/generate-image.ts --prompt "Logo design" --output /path/to/output.png
 *   npx tsx scripts/generate-image.ts --prompt "Hi-res landscape" --size 2K --aspect 16:9
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname, extname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const PROJECT_ROOT = join(__dirname, '..')
const OUTPUT_DIR = join(PROJECT_ROOT, 'workspace', 'generated')

// ─── Read .env ───────────────────────────────────────────────────────────────

function readEnv(): Record<string, string> {
  try {
    const content = readFileSync(join(PROJECT_ROOT, '.env'), 'utf-8')
    const env: Record<string, string> = {}
    for (const line of content.split('\n')) {
      const match = line.match(/^([^#=]+)=(.*)$/)
      if (match) env[match[1].trim()] = match[2].trim()
    }
    return env
  } catch {
    return {}
  }
}

const env = readEnv()
const API_KEY = env['OPENROUTER_API_KEY'] ?? process.env['OPENROUTER_API_KEY'] ?? ''
const API_URL = 'https://openrouter.ai/api/v1/chat/completions'
const DEFAULT_MODEL = 'google/gemini-3.1-flash-image-preview'

// ─── Parse args ──────────────────────────────────────────────────────────────

interface Args {
  prompt: string
  imagePath?: string
  outputPath?: string
  model?: string
  size?: string
  aspect?: string
}

function parseArgs(): Args {
  const args = process.argv.slice(2)
  let prompt = ''
  let imagePath: string | undefined
  let outputPath: string | undefined
  let model: string | undefined
  let size: string | undefined
  let aspect: string | undefined

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--prompt' && args[i + 1]) { prompt = args[++i]; continue }
    if (args[i] === '--image' && args[i + 1]) { imagePath = args[++i]; continue }
    if (args[i] === '--output' && args[i + 1]) { outputPath = args[++i]; continue }
    if (args[i] === '--model' && args[i + 1]) { model = args[++i]; continue }
    if (args[i] === '--size' && args[i + 1]) { size = args[++i]; continue }
    if (args[i] === '--aspect' && args[i + 1]) { aspect = args[++i]; continue }
    if (!prompt) prompt = args[i]
  }

  return { prompt, imagePath, outputPath, model, size, aspect }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  if (!API_KEY) {
    console.error('ERROR: OPENROUTER_API_KEY not set in .env')
    process.exit(1)
  }

  const { prompt, imagePath, outputPath, model, size, aspect } = parseArgs()
  if (!prompt) {
    console.error('Usage: npx tsx scripts/generate-image.ts --prompt "description" [--image input.png] [--output out.png] [--size 2K] [--aspect 16:9]')
    process.exit(1)
  }

  // Build message content
  type ContentPart =
    | { type: 'text'; text: string }
    | { type: 'image_url'; image_url: { url: string } }

  const content: ContentPart[] = [{ type: 'text', text: prompt }]

  if (imagePath) {
    const imageBuffer = readFileSync(imagePath)
    const base64 = imageBuffer.toString('base64')
    const ext = extname(imagePath).slice(1).toLowerCase()
    const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
      : ext === 'webp' ? 'image/webp'
      : ext === 'gif' ? 'image/gif'
      : 'image/png'
    content.push({
      type: 'image_url',
      image_url: { url: `data:${mimeType};base64,${base64}` },
    })
  }

  const body: Record<string, unknown> = {
    model: model ?? DEFAULT_MODEL,
    messages: [{ role: 'user', content }],
    modalities: ['image', 'text'],
    ...(size || aspect ? {
      image_config: {
        ...(size && { image_size: size }),
        ...(aspect && { aspect_ratio: aspect }),
      },
    } : {}),
  }

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const error = await res.text()
    console.error(`OpenRouter API error (${res.status}): ${error}`)
    process.exit(1)
  }

  const data = await res.json() as {
    choices?: Array<{
      message?: {
        content?: string
        images?: Array<{
          type: string
          image_url: { url: string }
        }>
      }
    }>
  }

  const message = data.choices?.[0]?.message
  if (!message) {
    console.error('No response from OpenRouter')
    console.error(JSON.stringify(data, null, 2))
    process.exit(1)
  }

  // Ensure output directory exists
  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true })

  let savedPath = ''
  const responseText = message.content ?? ''

  // Extract image from message.images array
  if (message.images?.length) {
    for (const img of message.images) {
      const dataUrl = img.image_url?.url ?? ''
      const match = dataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/)
      if (match) {
        const ext = match[1] === 'jpeg' ? 'jpg' : match[1]
        const filename = outputPath ?? join(OUTPUT_DIR, `img-${Date.now()}.${ext}`)

        const parentDir = dirname(filename)
        if (!existsSync(parentDir)) mkdirSync(parentDir, { recursive: true })

        writeFileSync(filename, Buffer.from(match[2], 'base64'))
        savedPath = filename
      }
    }
  }

  if (savedPath) console.log(`IMAGE:${savedPath}`)
  if (responseText) console.log(`TEXT:${responseText}`)
  if (!savedPath && !responseText) console.log('No image or text generated')
}

main().catch((err) => {
  console.error(`Error: ${err}`)
  process.exit(1)
})
