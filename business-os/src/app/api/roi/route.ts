import { NextRequest, NextResponse } from 'next/server'
import { computeROI, setValorHora } from '@/lib/roi'

export async function GET(req: NextRequest) {
  const dias = Math.min(Math.max(parseInt(req.nextUrl.searchParams.get('dias') ?? '30', 10) || 30, 1), 365)
  return NextResponse.json({ roi: await computeROI(dias) })
}

export async function PUT(req: NextRequest) {
  const { valorHora } = await req.json()
  const v = Number(valorHora)
  if (isNaN(v) || v <= 0) return NextResponse.json({ error: 'valorHora debe ser un número positivo' }, { status: 400 })
  await setValorHora(v)
  return NextResponse.json({ ok: true })
}
