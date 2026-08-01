import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Client } from 'ssh2'

interface GogCalendarEvent {
  id: string
  summary: string
  description?: string
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
  location?: string
}

interface GogResponse {
  events?: GogCalendarEvent[]
}

function sshExec(command: string): Promise<string> {
  const host = process.env.VPS_SSH_HOST
  const username = process.env.VPS_SSH_USER
  const password = process.env.VPS_SSH_PASSWORD

  if (!host || !username || !password) {
    return Promise.reject(new Error('VPS SSH credentials not configured'))
  }

  return new Promise((resolve, reject) => {
    const conn = new Client()
    let output = ''
    const timeout = setTimeout(() => {
      conn.end()
      reject(new Error('SSH timeout'))
    }, 15000)

    conn.on('ready', () => {
      conn.exec(command, (err, stream) => {
        if (err) {
          clearTimeout(timeout)
          conn.end()
          reject(err)
          return
        }
        stream.on('data', (data: Buffer) => {
          output += data.toString()
        })
        stream.stderr.on('data', () => {
          // ignore stderr
        })
        stream.on('close', () => {
          clearTimeout(timeout)
          conn.end()
          resolve(output)
        })
      })
    })
    conn.on('error', (err) => {
      clearTimeout(timeout)
      reject(err)
    })
    conn.connect({ host, port: 22, username, password })
  })
}

function parseGogEvents(gogEvents: GogCalendarEvent[]) {
  return gogEvents.map((e) => ({
    id: e.id,
    title: e.summary,
    description: e.description,
    start: e.start.dateTime || e.start.date || '',
    end: e.end.dateTime || e.end.date || '',
    allDay: !e.start.dateTime,
    account: 'business' as const,
    color: '#3b82f6',
    location: e.location,
  }))
}

// Validate date string format (YYYY-MM-DD)
function isValidDate(str: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(str)
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const from =
    searchParams.get('from') || new Date().toISOString().split('T')[0]
  const to =
    searchParams.get('to') ||
    new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]

  if (!isValidDate(from) || !isValidDate(to)) {
    return NextResponse.json({ events: [] })
  }

  try {
    const safeFrom = from.replace(/[^0-9-]/g, '')
    const safeTo = to.replace(/[^0-9-]/g, '')
    const container = process.env.CALENDAR_DOCKER_CONTAINER ?? 'agent-server'
    const account = process.env.CALENDAR_ACCOUNT ?? 'user@example.com'
    const cmd = `docker exec ${container} gog calendar events --account=${account} --from=${safeFrom} --to=${safeTo} --json --max=50`
    const raw = await sshExec(cmd)
    const data: GogResponse = JSON.parse(raw)
    const events = parseGogEvents(data.events || [])
    return NextResponse.json({ events })
  } catch (err) {
    console.error('Calendar fetch failed:', err)
    return NextResponse.json({ events: [] })
  }
}
