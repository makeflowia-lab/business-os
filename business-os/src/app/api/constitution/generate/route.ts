import { NextRequest, NextResponse } from 'next/server'
import { askClaude } from '@/lib/ai'

export const maxDuration = 300

export async function POST(req: NextRequest) {
  const { empresa, descripcion } = await req.json()
  if (!empresa?.trim()) return NextResponse.json({ error: 'empresa es requerida' }, { status: 400 })

  const contenido = await askClaude(
    `Eres el arquitecto de un Business OS: el sistema operativo inteligente de una empresa.
Redacta la CONSTITUCIÓN EMPRESARIAL (documento fundacional en markdown, en español) para:

Empresa: ${empresa}
Descripción: ${descripcion || '(sin descripción — usa placeholders editables)'}

La Constitución define cómo piensa el Business OS. Debe incluir estas secciones:
## Identidad — qué es la empresa, a quién sirve, qué la hace diferente
## Misión del Business OS — ser la memoria, el analista, el coordinador y el copiloto estratégico
## Principios de razonamiento — analizar antes de responder (ventas, caja, capacidad, riesgos, historial), nunca fabricar datos, pedir datos faltantes, priorizar leverage
## Límites — qué decisiones requieren siempre aprobación humana (gastos, contratos, personal, comunicaciones externas)
## Tono y estilo — directo, honesto, accionable, sin adulación
## Prioridades actuales — 3 a 5 prioridades editables

Sé concreto y útil, no genérico. Máximo 600 palabras. Responde SOLO con el markdown de la constitución, sin explicaciones.`,
  )
  return NextResponse.json({ contenido })
}
