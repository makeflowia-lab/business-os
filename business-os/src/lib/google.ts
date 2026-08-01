/**
 * Conector Google Workspace — Gmail + Drive.
 * Requiere credenciales OAuth2 (ver INTEGRACIONES.md) y `npm run google:auth` una vez.
 * El refresh token se guarda en bo_settings ('google_refresh_token').
 */
import { google } from 'googleapis'
import { getSetting } from './knowledge'
import { ingestDocument } from './knowledge'

export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/drive.readonly',
]

export function makeOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('Google no configurado: faltan GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET en .env.local (ver INTEGRACIONES.md)')
  }
  return new google.auth.OAuth2(clientId, clientSecret, 'urn:ietf:wg:oauth:2.0:oob')
}

export async function isGoogleConnected(): Promise<boolean> {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) return false
  return (await getSetting('google_refresh_token')) !== null
}

async function authedClient() {
  const refreshToken = await getSetting('google_refresh_token')
  if (!refreshToken) throw new Error('Google no conectado: corre `npm run google:auth` (ver INTEGRACIONES.md)')
  const auth = makeOAuthClient()
  auth.setCredentials({ refresh_token: refreshToken })
  return auth
}

// ── Gmail ───────────────────────────────────────────────────────────

export async function sendGmail(to: string, subject: string, body: string): Promise<string> {
  const auth = await authedClient()
  const gmail = google.gmail({ version: 'v1', auth })
  const raw = Buffer.from(
    `To: ${to}\r\nSubject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n${body}`,
  ).toString('base64url')
  const res = await gmail.users.messages.send({ userId: 'me', requestBody: { raw } })
  return res.data.id ?? 'enviado'
}

export interface EmailResumen { id: string; de: string; asunto: string; fecha: string; snippet: string }

export async function listRecentEmails(max = 10, query = 'in:inbox -category:promotions -category:social'): Promise<EmailResumen[]> {
  const auth = await authedClient()
  const gmail = google.gmail({ version: 'v1', auth })
  const list = await gmail.users.messages.list({ userId: 'me', maxResults: max, q: query })
  const out: EmailResumen[] = []
  for (const m of list.data.messages ?? []) {
    const msg = await gmail.users.messages.get({ userId: 'me', id: m.id!, format: 'metadata', metadataHeaders: ['From', 'Subject', 'Date'] })
    const h = (name: string) => msg.data.payload?.headers?.find((x) => x.name === name)?.value ?? ''
    out.push({ id: m.id!, de: h('From'), asunto: h('Subject'), fecha: h('Date'), snippet: msg.data.snippet ?? '' })
  }
  return out
}

/** Sincroniza los últimos correos al Knowledge Engine (uno por email, evita duplicados). */
export async function syncGmailToBrain(max = 10): Promise<{ nuevos: number; total: number }> {
  const emails = await listRecentEmails(max)
  const { q } = await import('./db')
  let nuevos = 0
  for (const e of emails) {
    const titulo = `Email: ${e.asunto || '(sin asunto)'}`
    const existing = await q<{ id: string }>(
      `SELECT id FROM bo_documents WHERE fuente = 'gmail' AND contenido LIKE $1 LIMIT 1`, [`%[gmail-id:${e.id}]%`],
    )
    if (existing.length) continue
    await ingestDocument(titulo, 'gmail', `De: ${e.de}\nFecha: ${e.fecha}\nAsunto: ${e.asunto}\n\n${e.snippet}\n\n[gmail-id:${e.id}]`)
    nuevos++
  }
  return { nuevos, total: emails.length }
}

// ── Drive ───────────────────────────────────────────────────────────

export interface DriveFile { id: string; nombre: string; mime: string; modificado: string }

export async function searchDrive(query: string, max = 10): Promise<DriveFile[]> {
  const auth = await authedClient()
  const drive = google.drive({ version: 'v3', auth })
  const res = await drive.files.list({
    q: `fullText contains '${query.replace(/'/g, "\\'")}' and trashed = false`,
    pageSize: max,
    fields: 'files(id, name, mimeType, modifiedTime)',
  })
  return (res.data.files ?? []).map((f) => ({ id: f.id!, nombre: f.name!, mime: f.mimeType ?? '', modificado: f.modifiedTime ?? '' }))
}

/** Descarga un archivo de Drive como texto (exporta Google Docs/Sheets) y lo absorbe al Brain. */
export async function importDriveFile(fileId: string): Promise<{ titulo: string; chunks: number }> {
  const auth = await authedClient()
  const drive = google.drive({ version: 'v3', auth })
  const meta = await drive.files.get({ fileId, fields: 'name, mimeType' })
  const nombre = meta.data.name ?? fileId
  const mime = meta.data.mimeType ?? ''

  let contenido: string
  if (mime === 'application/vnd.google-apps.document') {
    const res = await drive.files.export({ fileId, mimeType: 'text/plain' }, { responseType: 'text' })
    contenido = String(res.data)
  } else if (mime === 'application/vnd.google-apps.spreadsheet') {
    const res = await drive.files.export({ fileId, mimeType: 'text/csv' }, { responseType: 'text' })
    contenido = String(res.data)
  } else if (mime.startsWith('text/') || mime === 'application/json') {
    const res = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'text' })
    contenido = String(res.data)
  } else {
    throw new Error(`Tipo de archivo no soportado aún: ${mime} (soportados: Google Docs, Sheets, texto plano)`)
  }

  const r = await ingestDocument(nombre, 'drive', contenido)
  return { titulo: nombre, chunks: r.chunks }
}
