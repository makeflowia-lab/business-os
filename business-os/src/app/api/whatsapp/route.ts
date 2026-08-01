import { NextRequest, NextResponse } from 'next/server'
import { runInstruction } from '@/lib/engine'
import { sendWhatsApp, isAuthorizedNumber, isWhatsAppConfigured } from '@/lib/whatsapp'

export const maxDuration = 600

// Meta reintenta webhooks: dedupe de mensajes ya procesados (en memoria)
const processed = new Set<string>()

/** Verificación del webhook (Meta manda hub.challenge al configurarlo). */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams
  if (p.get('hub.mode') === 'subscribe' && p.get('hub.verify_token') === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(p.get('hub.challenge') ?? '', { status: 200 })
  }
  return NextResponse.json({ error: 'verify_token inválido' }, { status: 403 })
}

/** Mensajes entrantes. Respondemos 200 de inmediato (Meta exige rapidez) y procesamos async. */
export async function POST(req: NextRequest) {
  if (!isWhatsAppConfigured()) return NextResponse.json({ ok: true })

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ ok: true }) }

  try {
    const entry = (body as { entry?: Array<{ changes?: Array<{ value?: { messages?: Array<Record<string, unknown>> } }> }> }).entry
    const msg = entry?.[0]?.changes?.[0]?.value?.messages?.[0]
    if (msg && msg['type'] === 'text') {
      const id = String(msg['id'] ?? '')
      const from = String(msg['from'] ?? '')
      const text = String((msg['text'] as { body?: string })?.body ?? '').trim()

      if (id && !processed.has(id) && from && text) {
        processed.add(id)
        if (processed.size > 500) processed.clear()

        // Procesamiento asíncrono: el webhook responde ya, la respuesta llega por la API de envío
        void (async () => {
          try {
            if (!(await isAuthorizedNumber(from))) {
              await sendWhatsApp(from, '⛔ Este Business OS ya está vinculado a su dueño.')
              return
            }
            const respuesta = await runInstruction(text, 'whatsapp')
            await sendWhatsApp(from, respuesta)
          } catch (err) {
            console.error('whatsapp process error:', err)
            await sendWhatsApp(from, `⚠️ Error: ${String(err).slice(0, 300)}`).catch(() => {})
          }
        })()
      }
    }
  } catch (err) {
    console.error('whatsapp webhook parse error:', err)
  }

  return NextResponse.json({ ok: true })
}
