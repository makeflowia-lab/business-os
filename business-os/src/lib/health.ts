/**
 * Observabilidad — el sistema vigila su propia salud.
 * Los agentes "fallan en silencio" (gap reconocido del mercado): aquí no.
 */
import { q } from './db'
import { getSetting, setSetting } from './knowledge'
import { isGoogleConnected } from './google'
import { isWhatsAppConfigured } from './whatsapp'

/** El tick del scheduler marca latido cada 30 s — si falta, el bot está caído. */
export async function markTick(): Promise<void> {
  await setSetting('last_tick', String(Date.now()))
}

export interface Health {
  nucleo: 'operativo' | 'degradado' | 'critico'
  checks: Array<{ nombre: string; ok: boolean; detalle: string }>
}

export async function getSystemHealth(): Promise<Health> {
  const checks: Health['checks'] = []

  // 1. Base de datos (si esta query corre, Neon responde)
  let dbOk = true
  let cronsError: Array<{ nombre: string; last_result: string | null; activo: boolean }> = []
  let reglasSinDato = 0
  try {
    cronsError = await q(`SELECT nombre, last_result, activo FROM bo_schedules WHERE last_result LIKE 'Error:%' ORDER BY last_run DESC LIMIT 10`)
    const [r] = await q<{ n: string }>(
      `SELECT count(*) AS n FROM bo_rules r WHERE r.activo AND NOT EXISTS (SELECT 1 FROM bo_kpi_snapshots s WHERE s.kpi_id = r.kpi_id)`,
    )
    reglasSinDato = Number(r?.n ?? 0)
  } catch {
    dbOk = false
  }
  checks.push({ nombre: 'Enterprise Brain (Neon)', ok: dbOk, detalle: dbOk ? 'respondiendo' : 'sin conexión a la base de datos' })

  // 2. Scheduler/bot vivo (latido de los últimos 2 minutos)
  const lastTick = Number(await getSetting('last_tick').catch(() => null))
  const tickOk = !!lastTick && Date.now() - lastTick < 120_000
  checks.push({
    nombre: 'Bot + Scheduler + Centinela',
    ok: tickOk,
    detalle: lastTick ? `último latido hace ${Math.round((Date.now() - lastTick) / 1000)} s` : 'sin latido registrado — ¿está corriendo `npm run bot`?',
  })

  // 3. Crons con errores
  const activosConError = cronsError.filter((c) => c.activo)
  checks.push({
    nombre: 'Cron jobs',
    ok: activosConError.length === 0,
    detalle: cronsError.length === 0
      ? 'sin errores registrados'
      : `${cronsError.length} con último resultado en error${cronsError.filter((c) => !c.activo).length ? ` (${cronsError.filter((c) => !c.activo).length} auto-pausado(s))` : ''}`,
  })

  // 4. Reglas del Centinela sin datos que vigilar
  checks.push({
    nombre: 'Centinela',
    ok: reglasSinDato === 0,
    detalle: reglasSinDato === 0 ? 'todas las reglas tienen datos' : `${reglasSinDato} regla(s) vigilan KPIs sin ningún valor registrado`,
  })

  // 5. Integraciones
  const [google, whatsapp] = await Promise.all([isGoogleConnected().catch(() => false), Promise.resolve(isWhatsAppConfigured())])
  checks.push({ nombre: 'Google (Gmail/Drive)', ok: google, detalle: google ? 'enlazado' : 'sin conectar (opcional — INTEGRACIONES.md)' })
  checks.push({ nombre: 'WhatsApp Business', ok: whatsapp, detalle: whatsapp ? 'configurado' : 'sin credenciales (opcional — INTEGRACIONES.md)' })

  // Estado global: integraciones opcionales no degradan el núcleo
  const criticos = [dbOk, tickOk]
  const nucleo = criticos.every(Boolean)
    ? (activosConError.length === 0 && reglasSinDato === 0 ? 'operativo' : 'degradado')
    : 'critico'

  return { nucleo, checks }
}
