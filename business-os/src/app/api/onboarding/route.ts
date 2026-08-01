import { NextRequest, NextResponse } from 'next/server'
import { interviewStep, type QA } from '@/lib/onboarding'

export const maxDuration = 300

/** Un paso de la entrevista: recibe el historial y devuelve la siguiente pregunta o la propuesta final. */
export async function POST(req: NextRequest) {
  const { historial } = await req.json() as { historial: QA[] }
  try {
    const result = await interviewStep(Array.isArray(historial) ? historial : [])
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
