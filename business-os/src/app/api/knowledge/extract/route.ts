import { NextRequest, NextResponse } from 'next/server'
import { writeFile, unlink, mkdir } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'
import { askClaudeReadFile } from '@/lib/ai'
import { ingestDocument } from '@/lib/knowledge'

export const maxDuration = 600

const EXT_OK = ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'txt', 'md', 'csv', 'json', 'html']
const MAX_BYTES = 20 * 1024 * 1024

const INSTRUCCION: Record<string, string> = {
  pdf: 'Lee el PDF completo y transcribe TODO su contenido como texto plano estructurado en español. Conserva títulos, listas y tablas (como texto).',
  imagen: 'Mira la imagen y transcribe TODO el texto visible (factura, documento, nota, pizarra). Si hay montos, fechas o datos clave, inclúyelos exactos. Describe brevemente lo que es al inicio.',
  texto: 'Lee el archivo y devuelve su contenido íntegro como texto plano.',
}

/** Ingesta de no-estructurados: PDF/imagen → Claude multimodal → conocimiento del Brain. */
export async function POST(req: NextRequest) {
  const form = await req.formData()
  const file = form.get('file') as File | null
  const titulo = (form.get('titulo') as string | null)?.trim()
  if (!file) return NextResponse.json({ error: 'file requerido (multipart/form-data)' }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'archivo mayor a 20 MB' }, { status: 400 })

  const ext = (file.name.split('.').pop() ?? '').toLowerCase()
  if (!EXT_OK.includes(ext)) {
    return NextResponse.json({ error: `extensión .${ext} no soportada (${EXT_OK.join(', ')})` }, { status: 400 })
  }

  const dir = join(tmpdir(), 'business-os-uploads')
  await mkdir(dir, { recursive: true })
  const tmpPath = join(dir, `${randomUUID()}.${ext}`)
  await writeFile(tmpPath, Buffer.from(await file.arrayBuffer()))

  try {
    const kind = ext === 'pdf' ? 'pdf' : ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext) ? 'imagen' : 'texto'
    // Texto plano no necesita a Claude; PDF/imagen sí (multimodal)
    const contenido = kind === 'texto'
      ? Buffer.from(await file.arrayBuffer()).toString('utf8')
      : await askClaudeReadFile(tmpPath, INSTRUCCION[kind])

    if (!contenido.trim()) return NextResponse.json({ error: 'el archivo no produjo contenido' }, { status: 422 })

    const nombre = titulo || file.name.replace(/\.[^.]+$/, '')
    const r = await ingestDocument(nombre, kind === 'texto' ? 'archivo' : kind, contenido)
    return NextResponse.json({ ok: true, id: r.id, chunks: r.chunks, caracteres: contenido.length, tipo: kind })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  } finally {
    await unlink(tmpPath).catch(() => {})
  }
}
