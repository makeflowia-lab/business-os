import { NextRequest, NextResponse } from 'next/server'
import { executeAction, rejectAction } from '@/lib/engine'

export const maxDuration = 600

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const { op } = await req.json()

  try {
    if (op === 'rechazar') {
      await rejectAction(id)
      return NextResponse.json({ ok: true })
    }
    if (op === 'ejecutar') {
      const resultado = await executeAction(id)
      return NextResponse.json({ ok: true, resultado })
    }
    return NextResponse.json({ error: 'op inválida (ejecutar|rechazar)' }, { status: 400 })
  } catch (err) {
    const msg = String(err)
    return NextResponse.json({ error: msg }, { status: msg.includes('no encontrada') ? 404 : 500 })
  }
}
