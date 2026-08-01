import { NextRequest, NextResponse } from 'next/server'
import { listRules, createRule, setRuleActive, deleteRule } from '@/lib/rules'
import { audit } from '@/lib/audit'

export async function GET() {
  return NextResponse.json({ rules: await listRules() })
}

export async function POST(req: NextRequest) {
  const { nombre, kpiNombre, condicion, umbral, instruccion } = await req.json()
  if (!kpiNombre?.trim() || !['menor', 'mayor'].includes(condicion) || isNaN(Number(umbral))) {
    return NextResponse.json({ error: 'kpiNombre, condicion (menor|mayor) y umbral numérico son requeridos' }, { status: 400 })
  }
  try {
    const rule = await createRule({
      nombre: nombre?.trim() || `${kpiNombre} ${condicion === 'menor' ? '<' : '>'} ${umbral}`,
      kpiNombre: kpiNombre.trim(),
      condicion,
      umbral: Number(umbral),
      instruccion: instruccion?.trim() || undefined,
    })
    await audit('web', 'regla_creada', rule.nombre)
    return NextResponse.json({ ok: true, rule })
  } catch (err) {
    return NextResponse.json({ error: String(err instanceof Error ? err.message : err) }, { status: 400 })
  }
}

export async function PATCH(req: NextRequest) {
  const { id, activo } = await req.json()
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })
  await setRuleActive(id, !!activo)
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })
  await deleteRule(id)
  await audit('web', 'regla_borrada', id)
  return NextResponse.json({ ok: true })
}
