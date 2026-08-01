import { NextRequest, NextResponse } from 'next/server'
import { q } from '@/lib/db'
import { ingestDocument } from '@/lib/knowledge'

export async function GET() {
  const documents = await q(
    `SELECT d.id, d.titulo, d.fuente, d.created_at, length(d.contenido) AS caracteres,
            (SELECT count(*) FROM bo_chunks c WHERE c.document_id = d.id) AS chunks
       FROM bo_documents d ORDER BY d.created_at DESC LIMIT 200`,
  )
  return NextResponse.json({ documents })
}

export async function POST(req: NextRequest) {
  const { titulo, fuente, contenido } = await req.json()
  if (!titulo?.trim() || !contenido?.trim()) {
    return NextResponse.json({ error: 'titulo y contenido son requeridos' }, { status: 400 })
  }

  const r = await ingestDocument(titulo.trim(), fuente || 'manual', contenido)
  return NextResponse.json({ ok: true, id: r.id, chunks: r.chunks })
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })
  await q(`DELETE FROM bo_documents WHERE id = $1`, [id])
  return NextResponse.json({ ok: true })
}
