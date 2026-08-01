import { NextRequest, NextResponse } from 'next/server'
import { getSetting, setSetting } from '@/lib/knowledge'
import { audit } from '@/lib/audit'

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key')
  if (!key) return NextResponse.json({ error: 'Llave requerida' }, { status: 400 })
  const value = await getSetting(key)
  return NextResponse.json({ value })
}

export async function POST(req: NextRequest) {
  const { key, value } = await req.json()
  if (!key || value === undefined) {
    return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 })
  }
  await setSetting(key, String(value))
  await audit('web', 'setting_changed', `Configuración ${key} cambiada a ${value}`)
  return NextResponse.json({ ok: true })
}
