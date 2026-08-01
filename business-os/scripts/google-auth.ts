/**
 * Conecta el Business OS con Google (Gmail + Drive) una sola vez.
 * Requiere GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en .env.local (ver INTEGRACIONES.md).
 * Uso: npm run google:auth
 */
import { config } from 'dotenv'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createInterface } from 'readline'
import http from 'http'

const __dir = dirname(fileURLToPath(import.meta.url))
config({ path: join(__dir, '..', '.env.local') })

async function main() {
  const { google } = await import('googleapis')
  const { setSetting } = await import('../src/lib/knowledge')
  const { GOOGLE_SCOPES } = await import('../src/lib/google')

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    console.error('✗ Faltan GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET en .env.local — sigue INTEGRACIONES.md')
    process.exit(1)
  }

  // Loopback local para capturar el código OAuth automáticamente
  const PORT = 8756
  const redirect = `http://localhost:${PORT}`
  const auth = new google.auth.OAuth2(clientId, clientSecret, redirect)
  const url = auth.generateAuthUrl({ access_type: 'offline', prompt: 'consent', scope: GOOGLE_SCOPES })

  console.log('\n1. Abre esta URL en tu navegador y autoriza el acceso:\n')
  console.log(url)
  console.log('\n2. Esperando autorización en ' + redirect + ' …\n')

  const code = await new Promise<string>((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const u = new URL(req.url ?? '/', redirect)
      const c = u.searchParams.get('code')
      if (c) {
        res.end('✓ Business OS conectado con Google. Ya puedes cerrar esta pestaña.')
        server.close()
        resolve(c)
      } else {
        res.end('Esperando código…')
      }
    })
    server.listen(PORT)
    server.on('error', reject)
    // Fallback manual por si el navegador no puede redirigir a localhost
    const rl = createInterface({ input: process.stdin, output: process.stdout })
    rl.question('(o pega aquí el código si la página no redirige): ', (manual) => {
      if (manual.trim()) { server.close(); rl.close(); resolve(manual.trim()) }
    })
  })

  const { tokens } = await auth.getToken(code)
  if (!tokens.refresh_token) {
    console.error('✗ Google no devolvió refresh_token. Revoca el acceso en myaccount.google.com/permissions y reintenta.')
    process.exit(1)
  }
  await setSetting('google_refresh_token', tokens.refresh_token)
  console.log('\n✓ Conectado. El refresh token quedó guardado en el Brain (bo_settings).')
  console.log('✓ Gmail y Drive disponibles para el bot, el router y los cron jobs.')
  process.exit(0)
}

main().catch((err) => { console.error('✗ Error:', err.message ?? err); process.exit(1) })
