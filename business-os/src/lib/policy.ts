/**
 * Policy Engine — los límites de la Constitución, pero EJECUTABLES.
 * Define qué puede hacer el OS de forma autónoma y qué exige siempre
 * la aprobación del dueño. Se inyecta en el contexto de todos los motores.
 */
import { getSetting, setSetting } from './knowledge'

export interface Policies {
  /** Enviar emails automáticamente si hay destinatario y Gmail conectado (false = siempre a la cola) */
  email_auto: boolean
  /** Tipos de acción sugerida que el OS ejecuta solo, sin pasar por la cola */
  auto_ejecutar: string[]
  /** Monto máximo (en tu moneda) que una acción puede implicar sin aprobación explícita; null = sin límite definido */
  monto_max: number | null
}

const DEFAULTS: Policies = { email_auto: false, auto_ejecutar: [], monto_max: null }

export async function getPolicies(): Promise<Policies> {
  try {
    const raw = await getSetting('politicas')
    if (!raw) return DEFAULTS
    const p = JSON.parse(raw) as Partial<Policies>
    return {
      email_auto: !!p.email_auto,
      auto_ejecutar: Array.isArray(p.auto_ejecutar) ? p.auto_ejecutar : [],
      monto_max: typeof p.monto_max === 'number' && p.monto_max > 0 ? p.monto_max : null,
    }
  } catch {
    return DEFAULTS
  }
}

export async function setPolicies(p: Policies): Promise<void> {
  await setSetting('politicas', JSON.stringify(p))
}

/** Texto para el contexto del Brain: los motores razonan respetando estas políticas. */
export async function policyContext(): Promise<string> {
  const p = await getPolicies()
  const lineas = [
    p.email_auto
      ? '- Emails: pueden enviarse automáticamente si hay destinatario claro.'
      : '- Emails: NUNCA se envían solos — siempre quedan como borrador en la cola de Acciones para aprobación del dueño.',
    p.auto_ejecutar.length
      ? `- Acciones auto-ejecutables sin aprobación: ${p.auto_ejecutar.join(', ')}. Todo lo demás pasa por la cola.`
      : '- TODAS las acciones sugeridas pasan por la cola de aprobación del dueño.',
    p.monto_max
      ? `- LÍMITE DE MONTO: cualquier acción/decisión que implique más de $${p.monto_max} exige SIEMPRE aprobación explícita del dueño — nunca la ejecutes ni la recomiendes ejecutar sin decirlo.`
      : '',
  ].filter(Boolean)
  return `# POLÍTICAS DE EJECUCIÓN (Gobierno — obligatorias)\n${lineas.join('\n')}`
}
