import { NextRequest, NextResponse } from 'next/server'
import { applyOnboarding, type Propuesta } from '@/lib/onboarding'

export const maxDuration = 300

export async function POST(req: NextRequest) {
  const { propuesta } = await req.json() as { propuesta: Propuesta }
  if (!propuesta?.empresa || !propuesta?.constitucion_md) {
    return NextResponse.json({ error: 'propuesta incompleta' }, { status: 400 })
  }
  try {
    const r = await applyOnboarding(propuesta)
    return NextResponse.json({ ok: true, ...r })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
