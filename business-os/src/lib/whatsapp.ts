/**
 * Canal WhatsApp Business (Meta Cloud API) — el canal donde vive la PyME.
 * Mismo cerebro que web/Telegram: todo pasa por runInstruction.
 * Config: WHATSAPP_TOKEN + WHATSAPP_PHONE_NUMBER_ID + WHATSAPP_VERIFY_TOKEN
 * (ver INTEGRACIONES.md). Se vincula al primer número que escriba.
 */
import { getSetting, setSetting } from './knowledge'
import { recordMemory } from './brain'

const GRAPH = 'https://graph.facebook.com/v21.0'
const MAX_MSG = 3800

export function isWhatsAppConfigured(): boolean {
  return !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_VERIFY_TOKEN)
}

export async function sendWhatsApp(to: string, text: string): Promise<void> {
  const token = process.env.WHATSAPP_TOKEN
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID
  if (!token || !phoneId) throw new Error('WhatsApp no configurado (ver INTEGRACIONES.md)')

  const clean = text.trim() || '(sin contenido)'
  for (let i = 0; i < clean.length; i += MAX_MSG) {
    const res = await fetch(`${GRAPH}/${phoneId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: clean.slice(i, i + MAX_MSG) },
      }),
    })
    if (!res.ok) {
      const err = await res.text().catch(() => '')
      throw new Error(`WhatsApp API ${res.status}: ${err.slice(0, 300)}`)
    }
  }
}

/** Un dueño, un número: se vincula al primero que escriba (o WHATSAPP_ALLOWED_NUMBER fijo). */
export async function isAuthorizedNumber(from: string): Promise<boolean> {
  const fixed = process.env.WHATSAPP_ALLOWED_NUMBER?.replace(/\D/g, '')
  const normalized = from.replace(/\D/g, '')
  if (fixed) return normalized === fixed

  const bound = await getSetting('whatsapp_number')
  if (!bound) {
    await setSetting('whatsapp_number', normalized)
    await recordMemory('evento', 'WhatsApp vinculado', `Número: ${normalized}`)
    return true
  }
  return normalized === bound
}
