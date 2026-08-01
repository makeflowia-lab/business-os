import { NextRequest, NextResponse } from 'next/server'
import { listSchedules, createSchedule, setScheduleActive, deleteSchedule } from '@/lib/scheduler'
import { isGoogleConnected } from '@/lib/google'
import { isWhatsAppConfigured } from '@/lib/whatsapp'
import { audit } from '@/lib/audit'

export async function GET() {
  const [schedules, google] = await Promise.all([listSchedules(), isGoogleConnected()])
  return NextResponse.json({ schedules, google, whatsapp: isWhatsAppConfigured() })
}

export async function POST(req: NextRequest) {
  const { nombre, cron, instruccion } = await req.json()
  if (!nombre?.trim() || !cron?.trim() || !instruccion?.trim()) {
    return NextResponse.json({ error: 'nombre, cron e instruccion son requeridos' }, { status: 400 })
  }
  try {
    const schedule = await createSchedule(nombre.trim(), cron.trim(), instruccion.trim())
    await audit('web', 'cron_creado', `${schedule.nombre} (${schedule.cron})`)
    return NextResponse.json({ ok: true, schedule })
  } catch (err) {
    return NextResponse.json({ error: `Cron inválido: ${String(err)}` }, { status: 400 })
  }
}

export async function PATCH(req: NextRequest) {
  const { id, activo } = await req.json()
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })
  await setScheduleActive(id, !!activo)
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })
  await deleteSchedule(id)
  await audit('web', 'cron_borrado', id)
  return NextResponse.json({ ok: true })
}
