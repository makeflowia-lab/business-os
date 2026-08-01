import { NextRequest, NextResponse } from 'next/server'
import { getPolicies, setPolicies } from '@/lib/policy'
import { audit } from '@/lib/audit'

export async function GET() {
  return NextResponse.json({ policies: await getPolicies() })
}

export async function PUT(req: NextRequest) {
  const { email_auto, auto_ejecutar, monto_max } = await req.json()
  const policies = {
    email_auto: !!email_auto,
    auto_ejecutar: Array.isArray(auto_ejecutar) ? auto_ejecutar.filter((t: unknown) => typeof t === 'string') : [],
    monto_max: typeof monto_max === 'number' && monto_max > 0 ? monto_max : null,
  }
  await setPolicies(policies)
  await audit('web', 'politicas', `email_auto=${policies.email_auto} · auto_ejecutar=[${policies.auto_ejecutar.join(',')}] · monto_max=${policies.monto_max ?? 'sin límite'}`)
  return NextResponse.json({ ok: true, policies })
}
