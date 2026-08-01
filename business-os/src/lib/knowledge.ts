import { q } from './db'
import { chunkText } from './chunk'
import { recordMemory } from './brain'

async function getEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) return null

  try {
    const res = await fetch('https://openrouter.ai/api/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/text-embedding-3-small',
        input: text.slice(0, 8000), // límite de tokens por chunk
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.data?.[0]?.embedding || null
  } catch (e) {
    return null
  }
}

/** Ingesta unificada: cualquier canal (web, telegram, gmail, drive, cron) pasa por aquí. */
export async function ingestDocument(titulo: string, fuente: string, contenido: string): Promise<{ id: string; chunks: number }> {
  const [doc] = await q<{ id: string }>(
    `INSERT INTO bo_documents (titulo, fuente, contenido) VALUES ($1, $2, $3) RETURNING id`,
    [titulo, fuente, contenido],
  )
  const chunks = chunkText(contenido)
  for (let i = 0; i < chunks.length; i++) {
    const textChunk = chunks[i]
    const embedding = await getEmbedding(textChunk)

    if (embedding) {
      await q(`INSERT INTO bo_chunks (document_id, idx, contenido, embedding) VALUES ($1, $2, $3, $4::vector)`, [doc.id, i, textChunk, JSON.stringify(embedding)])
    } else {
      await q(`INSERT INTO bo_chunks (document_id, idx, contenido) VALUES ($1, $2, $3)`, [doc.id, i, textChunk])
    }
  }
  await recordMemory('conocimiento', `Documento ingresado: ${titulo}`, `${chunks.length} fragmentos, fuente: ${fuente}`, doc.id)
  return { id: doc.id, chunks: chunks.length }
}

export async function getSetting(key: string): Promise<string | null> {
  const rows = await q<{ value: string }>(`SELECT value FROM bo_settings WHERE key = $1`, [key])
  return rows[0]?.value ?? null
}

export async function setSetting(key: string, value: string): Promise<void> {
  await q(`INSERT INTO bo_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2`, [key, value])
}
