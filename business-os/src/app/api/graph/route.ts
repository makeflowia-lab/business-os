import { NextRequest, NextResponse } from 'next/server'
import { getGraph, linkEntities, deleteLink } from '@/lib/graph'

export async function GET() {
  return NextResponse.json(await getGraph())
}

export async function POST(req: NextRequest) {
  const { origen, relacion, destino, tipoOrigen, tipoDestino } = await req.json()
  if (!origen?.trim() || !relacion?.trim() || !destino?.trim()) {
    return NextResponse.json({ error: 'origen, relacion y destino son requeridos' }, { status: 400 })
  }
  const r = await linkEntities(origen.trim(), relacion.trim(), destino.trim(), tipoOrigen || 'otro', tipoDestino || 'otro')
  return NextResponse.json({ ok: true, ...r })
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })
  await deleteLink(id)
  return NextResponse.json({ ok: true })
}
