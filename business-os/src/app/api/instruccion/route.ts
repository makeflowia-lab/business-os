import { NextRequest, NextResponse } from 'next/server'
import { runInstruction } from '@/lib/engine'

export const maxDuration = 600

/** El gerente da la instrucción; el Instruction Router la ejecuta. Mismo motor que Telegram. */
export async function POST(req: NextRequest) {
  const { texto } = await req.json()
  if (!texto?.trim()) return NextResponse.json({ error: 'texto requerido' }, { status: 400 })
  try {
    const resultado = await runInstruction(texto.trim(), 'web')
    return NextResponse.json({ ok: true, resultado })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
