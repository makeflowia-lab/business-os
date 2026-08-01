import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

const OPENCLAW_GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN

// Lazy init — avoids build-time crash when VAPID env vars are missing
let vapidReady = false
function ensureVapid() {
  if (vapidReady) return
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL ?? 'admin@example.com'}`,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '',
    process.env.VAPID_PRIVATE_KEY ?? ''
  )
  vapidReady = true
}

// Accepts: Bearer (OPENCLAW_GATEWAY_TOKEN) OR authenticated session
async function isAuthorized(req: NextRequest): Promise<boolean> {
  const authHeader = req.headers.get('Authorization')
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '')
    if (token === OPENCLAW_GATEWAY_TOKEN) return true
  }
  // Fall back to session check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return !!user
}

export async function POST(req: NextRequest) {
  ensureVapid()
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { title, body: msgBody, url, tag, userId } = body as {
    title?: string
    body?: string
    url?: string
    tag?: string
    userId?: string
  }

  // Use service client to bypass RLS (needed when called via bearer token)
  const supabase = createServiceClient()

  // Fetch target subscriptions
  let query = supabase.from('push_subscriptions').select('*')
  if (userId) query = query.eq('user_id', userId)

  const { data: subs, error: fetchError } = await query
  if (fetchError) {
    console.error('fetch push_subscriptions error:', fetchError)
    return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 })
  }
  if (!subs || subs.length === 0) {
    return NextResponse.json({ sent: 0 })
  }

  const payload = JSON.stringify({
    title: title ?? 'Mission Control',
    body: msgBody ?? '',
    url: url ?? '/',
    tag: tag ?? 'mc-notification',
    icon: '/icon.svg',
  })

  let sent = 0
  const invalidEndpoints: string[] = []

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload
        )
        sent++
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode
        // 4xx = subscription expired/invalid — remove it
        if (status && status >= 400 && status < 500) {
          invalidEndpoints.push(sub.endpoint)
        }
      }
    })
  )

  // Clean up invalid subscriptions
  if (invalidEndpoints.length > 0) {
    await supabase
      .from('push_subscriptions')
      .delete()
      .in('endpoint', invalidEndpoints)
  }

  return NextResponse.json({ sent, cleaned: invalidEndpoints.length })
}
