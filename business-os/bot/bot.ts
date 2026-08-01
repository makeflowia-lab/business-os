/**
 * Business OS — Bot de Telegram
 * Canal móvil del Enterprise Brain: el gerente da instrucciones, el BO ejecuta.
 * Incluye el tick del scheduler (cron jobs). Proceso independiente:
 *   npm run bot
 */
import { config } from 'dotenv'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
config({ path: join(__dir, '..', '.env.local') })

import { Bot, Context } from 'grammy'
import { q } from '../src/lib/db'
import { searchKnowledge, recordMemory, getConstitution } from '../src/lib/brain'
import { ingestDocument, getSetting, setSetting } from '../src/lib/knowledge'
import {
  runDecision, chatWithAgent, executeAction, rejectAction,
  runInstruction, getResumenText, type Analisis,
} from '../src/lib/engine'
import { listSchedules, setScheduleActive, deleteSchedule, runDueSchedules } from '../src/lib/scheduler'
import { listRules, checkRules } from '../src/lib/rules'
import { markTick } from '../src/lib/health'
import { isGoogleConnected, syncGmailToBrain, searchDrive, importDriveFile } from '../src/lib/google'

const TOKEN = process.env.TELEGRAM_BOT_TOKEN
if (!TOKEN) { console.error('FATAL: TELEGRAM_BOT_TOKEN no está en .env.local'); process.exit(1) }

const bot = new Bot(TOKEN)

// ── Autorización: un dueño, un chat ─────────────────────────────────

async function ensureSettings(): Promise<void> {
  await q(`CREATE TABLE IF NOT EXISTS bo_settings (key text PRIMARY KEY, value text NOT NULL)`)
}

async function isAuthorized(ctx: Context): Promise<boolean> {
  const chatId = String(ctx.chat?.id ?? '')
  if (!chatId) return false
  const fixed = process.env.TELEGRAM_ALLOWED_CHAT_ID?.trim()
  if (fixed) return chatId === fixed
  const bound = await getSetting('telegram_chat_id')
  if (!bound) {
    await setSetting('telegram_chat_id', chatId)
    await recordMemory('evento', 'Bot de Telegram vinculado', `Chat ID: ${chatId}`)
    return true
  }
  return chatId === bound
}

// ── Helpers ─────────────────────────────────────────────────────────

const MAX_MSG = 3800

async function sendLong(ctx: Context, text: string): Promise<void> {
  const clean = text.trim() || '(sin contenido)'
  for (let i = 0; i < clean.length; i += MAX_MSG) {
    await ctx.reply(clean.slice(i, i + MAX_MSG))
  }
}

async function withTyping<T>(ctx: Context, work: Promise<T>): Promise<T> {
  const chatId = ctx.chat!.id
  await bot.api.sendChatAction(chatId, 'typing').catch(() => {})
  const interval = setInterval(() => bot.api.sendChatAction(chatId, 'typing').catch(() => {}), 5000)
  try { return await work } finally { clearInterval(interval) }
}

function formatAnalisis(a: Analisis): string {
  const lentes = (a.lentes ?? []).map((l) => {
    const faltan = l.datos_faltantes?.length ? `\n   ⚠ faltan: ${l.datos_faltantes.join('; ')}` : ''
    return `• ${l.lente.toUpperCase()}\n   ${l.analisis}${faltan}`
  }).join('\n\n')
  const partes = [
    `🧠 ANÁLISIS COMPLETADO — confianza ${a.confianza}%`,
    `📌 ${a.resumen}`,
    lentes ? `🔍 LENTES\n\n${lentes}` : '',
    a.riesgos?.length ? `⚠️ RIESGOS\n${a.riesgos.map((r) => `• ${r}`).join('\n')}` : '',
    a.oportunidades?.length ? `💡 OPORTUNIDADES\n${a.oportunidades.map((o) => `• ${o}`).join('\n')}` : '',
    `✅ RECOMENDACIÓN\n${a.recomendacion}`,
    a.condiciones?.length ? `🔀 Cambia si: ${a.condiciones.join(' · ')}` : '',
    a.acciones_sugeridas?.length ? `⚡ ${a.acciones_sugeridas.length} acción(es) sugerida(s) encolada(s) — revisa con /acciones` : '',
  ]
  return partes.filter(Boolean).join('\n\n')
}

// Modo por chat: 'auto' = Instruction Router decide; o un agente fijo
const chatMode = new Map<number, string>()

const AYUDA = `🧠 Business OS — tu empresa en el bolsillo

Escríbeme la instrucción y yo la ejecuto: "registra ventas de hoy 4500", "mándale un email a Juan confirmando la reunión", "todos los días a las 8am envíame el resumen", "¿contratamos otro vendedor?"…

Modo agente fijo:
/agente <id> — hablar solo con un especialista (ej: /agente finanzas)
/auto — volver al modo automático (router)
/agentes — ver los 9 especialistas

Directos:
/decidir <pregunta> — Decision Engine completo
/resumen — estado del cerebro
/buscar <tema> — buscar en el conocimiento
/doc <título> | <contenido> — guardar conocimiento
/kpi <nombre> <valor> — registrar métrica

Automatización:
/tareas — cron jobs programados
/pausar /reanudar /borrar <n> — gestionar cron jobs
/reglas — centinela: vigilancia de KPIs por umbral
/acciones — pendientes · /ejecutar <n> · /rechazar <n>

Google:
/google — estado de la conexión
/gmail [n] — sincronizar correos al Brain
/drive <consulta> — buscar en Drive
/importar <consulta> — importar archivo de Drive al Brain`

// ── Middleware de auth ──────────────────────────────────────────────

bot.use(async (ctx, next) => {
  if (await isAuthorized(ctx)) return next()
  await ctx.reply('⛔ Este Business OS ya está vinculado a su dueño.')
})

// ── Comandos base ───────────────────────────────────────────────────

bot.command('start', async (ctx) => {
  const constitution = await getConstitution()
  const encabezado = constitution
    ? `Conectado al Business OS de ${constitution.empresa} (Constitución v${constitution.version}).`
    : 'Conectado. Aún no hay Constitución Empresarial — fúndala en la consola web.'
  await ctx.reply(`✅ ${encabezado}\n\n${AYUDA}`)
})

bot.command('help', (ctx) => ctx.reply(AYUDA))

bot.command('agentes', async (ctx) => {
  const agents = await q<{ id: string; nombre: string; emoji: string }>(
    `SELECT id, nombre, emoji FROM bo_agents WHERE activo ORDER BY nombre`,
  )
  const actual = chatMode.get(ctx.chat.id) ?? 'auto'
  const lista = agents.map((a) => `${a.emoji} ${a.nombre} — /agente ${a.id}${a.id === actual ? '  ← activo' : ''}`).join('\n')
  await ctx.reply(`Especialistas (todos comparten el mismo cerebro):\n\n${lista}\n\nModo actual: ${actual === 'auto' ? '🤖 automático (router)' : actual}\nVolver al automático: /auto`)
})

bot.command('agente', async (ctx) => {
  const id = ctx.match?.trim().toLowerCase()
  if (!id) return ctx.reply('Uso: /agente <id>  (ej: /agente finanzas — ver ids con /agentes)')
  const [agent] = await q<{ id: string; nombre: string; emoji: string }>(
    `SELECT id, nombre, emoji FROM bo_agents WHERE id = $1 AND activo`, [id],
  )
  if (!agent) return ctx.reply(`No existe el agente "${id}". Ver /agentes`)
  chatMode.set(ctx.chat.id, agent.id)
  await ctx.reply(`${agent.emoji} ${agent.nombre} fijado. Todo lo que escribas va a él. Volver al modo automático: /auto`)
})

bot.command('auto', async (ctx) => {
  chatMode.set(ctx.chat.id, 'auto')
  await ctx.reply('🤖 Modo automático: dame instrucciones y yo decido qué motor las ejecuta.')
})

bot.command('decidir', async (ctx) => {
  const pregunta = ctx.match?.trim()
  if (!pregunta) return ctx.reply('Uso: /decidir <pregunta>')
  await ctx.reply('🧠 Decision Engine activado. Analizando la empresa por todas las lentes… (1-3 min)')
  try {
    const { analisis } = await withTyping(ctx, runDecision(pregunta, 'telegram'))
    await sendLong(ctx, formatAnalisis(analisis))
  } catch (err) {
    await ctx.reply(`⚠️ Error en el análisis: ${String(err).slice(0, 300)}`)
  }
})

bot.command('resumen', async (ctx) => sendLong(ctx, await getResumenText()))

bot.command('buscar', async (ctx) => {
  const tema = ctx.match?.trim()
  if (!tema) return ctx.reply('Uso: /buscar <tema>')
  const results = await searchKnowledge(tema, 5)
  if (!results.length) return ctx.reply('El Brain no tiene nada sobre eso todavía. Aliméntalo con /doc')
  await sendLong(ctx, results.map((r) => `📄 ${r.titulo}\n${r.contenido.slice(0, 350)}`).join('\n\n———\n\n'))
})

bot.command('doc', async (ctx) => {
  const raw = ctx.match?.trim()
  if (!raw) return ctx.reply('Uso: /doc <título> | <contenido>')
  let titulo: string, contenido: string
  if (raw.includes('|')) {
    const i = raw.indexOf('|')
    titulo = raw.slice(0, i).trim(); contenido = raw.slice(i + 1).trim()
  } else if (raw.includes('\n')) {
    const i = raw.indexOf('\n')
    titulo = raw.slice(0, i).trim(); contenido = raw.slice(i + 1).trim()
  } else {
    titulo = raw.slice(0, 60); contenido = raw
  }
  if (!contenido) return ctx.reply('Falta el contenido después del título.')
  const r = await ingestDocument(titulo, 'telegram', contenido)
  await ctx.reply(`📚 Absorbido al Brain: "${titulo}" (${r.chunks} fragmento(s)).`)
})

bot.command('kpi', async (ctx) => {
  const parts = ctx.match?.trim().split(/\s+/) ?? []
  if (parts.length < 2) return ctx.reply('Uso: /kpi <nombre> <valor>')
  const valor = Number(parts[parts.length - 1].replace(',', '.'))
  if (isNaN(valor)) return ctx.reply('El último dato debe ser un número. Uso: /kpi <nombre> <valor>')
  const nombre = parts.slice(0, -1).join(' ')
  const [kpi] = await q<{ id: string }>(
    `INSERT INTO bo_kpis (nombre) VALUES ($1) ON CONFLICT (nombre) DO UPDATE SET nombre = $1 RETURNING id`, [nombre],
  )
  await q(`INSERT INTO bo_kpi_snapshots (kpi_id, valor) VALUES ($1, $2)`, [kpi.id, valor])
  await recordMemory('evento', `KPI actualizado: ${nombre} = ${valor}`, 'vía Telegram')
  await ctx.reply(`📊 ${nombre} = ${valor} registrado.`)
})

// ── Acciones ────────────────────────────────────────────────────────

async function pendientes(): Promise<Array<{ id: string; tipo: string; titulo: string }>> {
  return q(`SELECT id, tipo, titulo FROM bo_actions WHERE estado = 'pendiente' ORDER BY created_at ASC LIMIT 20`)
}

bot.command('accion', async (ctx) => {
  const texto = ctx.match?.trim()
  if (!texto) return ctx.reply('Uso: /accion <qué hay que hacer>')
  await q(`INSERT INTO bo_actions (tipo, titulo, origen) VALUES ('tarea', $1, 'manual')`, [texto])
  await ctx.reply(`⚡ Encolada: "${texto}". Ver pendientes con /acciones`)
})

bot.command('acciones', async (ctx) => {
  const list = await pendientes()
  if (!list.length) return ctx.reply('No hay acciones pendientes. ✨')
  const txt = list.map((a, i) => `${i + 1}. [${a.tipo}] ${a.titulo}`).join('\n')
  await ctx.reply(`⚡ Pendientes de aprobación:\n\n${txt}\n\n/ejecutar <n> · /rechazar <n>`)
})

bot.command('ejecutar', async (ctx) => {
  const n = parseInt(ctx.match?.trim() ?? '', 10)
  const list = await pendientes()
  if (isNaN(n) || n < 1 || n > list.length) return ctx.reply(`Uso: /ejecutar <n> (1-${list.length || 0}, ver /acciones)`)
  const target = list[n - 1]
  await ctx.reply(`⚙️ Ejecutando "${target.titulo}"… (puede tardar 1-2 min)`)
  try {
    const resultado = await withTyping(ctx, executeAction(target.id, 'telegram'))
    await sendLong(ctx, `✅ Ejecutada: ${target.titulo}\n\n${resultado}`)
  } catch (err) {
    await ctx.reply(`⚠️ Error: ${String(err).slice(0, 300)}`)
  }
})

bot.command('rechazar', async (ctx) => {
  const n = parseInt(ctx.match?.trim() ?? '', 10)
  const list = await pendientes()
  if (isNaN(n) || n < 1 || n > list.length) return ctx.reply(`Uso: /rechazar <n> (1-${list.length || 0}, ver /acciones)`)
  await rejectAction(list[n - 1].id, 'telegram')
  await ctx.reply(`🗑️ Rechazada: "${list[n - 1].titulo}"`)
})

// ── Cron jobs ───────────────────────────────────────────────────────

bot.command('tareas', async (ctx) => {
  const list = await listSchedules()
  if (!list.length) return ctx.reply('No hay cron jobs. Programa uno hablando normal: "todos los días a las 8am mándame el resumen"')
  const txt = list.map((s, i) =>
    `${i + 1}. ${s.activo ? '🟢' : '⏸️'} ${s.nombre}\n   ${s.cron} → ${s.instruccion.slice(0, 80)}\n   próxima: ${s.next_run ? new Date(s.next_run).toLocaleString('es-MX') : '—'}`,
  ).join('\n\n')
  await sendLong(ctx, `⏰ Cron jobs:\n\n${txt}\n\n/pausar <n> · /reanudar <n> · /borrar <n>`)
})

async function scheduleByIndex(ctx: Context, match: string | undefined): Promise<{ id: string; nombre: string } | null> {
  const n = parseInt(match?.trim() ?? '', 10)
  const list = await listSchedules()
  if (isNaN(n) || n < 1 || n > list.length) {
    await ctx.reply(`Índice inválido (1-${list.length || 0}, ver /tareas)`)
    return null
  }
  return list[n - 1]
}

bot.command('pausar', async (ctx) => {
  const s = await scheduleByIndex(ctx, ctx.match)
  if (!s) return
  await setScheduleActive(s.id, false)
  await ctx.reply(`⏸️ Pausado: "${s.nombre}"`)
})

bot.command('reanudar', async (ctx) => {
  const s = await scheduleByIndex(ctx, ctx.match)
  if (!s) return
  await setScheduleActive(s.id, true)
  await ctx.reply(`🟢 Reanudado: "${s.nombre}"`)
})

bot.command('borrar', async (ctx) => {
  const s = await scheduleByIndex(ctx, ctx.match)
  if (!s) return
  await deleteSchedule(s.id)
  await ctx.reply(`🗑️ Borrado: "${s.nombre}"`)
})

bot.command('reglas', async (ctx) => {
  const rules = await listRules()
  if (!rules.length) return ctx.reply('Sin reglas centinela. Crea una hablando normal: "si el MRR baja de 1000 avísame"')
  const txt = rules.map((r, i) =>
    `${i + 1}. ${r.activo ? '🛡️' : '⏸️'} ${r.nombre}\n   ${r.kpi_nombre} ${r.condicion === 'menor' ? '<' : '>'} ${r.umbral} (actual: ${r.ultimo_valor ?? 'sin dato'})${r.instruccion ? `\n   → ${r.instruccion}` : ''}`,
  ).join('\n\n')
  await sendLong(ctx, `🛡️ Centinela:\n\n${txt}`)
})

// ── Google (Gmail + Drive) ──────────────────────────────────────────

bot.command('google', async (ctx) => {
  const connected = await isGoogleConnected()
  if (connected) return ctx.reply('🟢 Google conectado: Gmail y Drive disponibles.\n/gmail [n] · /drive <consulta> · /importar <consulta>')
  const hasCreds = !!process.env.GOOGLE_CLIENT_ID
  await ctx.reply(hasCreds
    ? '🟡 Credenciales listas pero falta autorizar: corre `npm run google:auth` en la PC.'
    : '🔴 Google no configurado. Sigue business-os/INTEGRACIONES.md (crear credenciales OAuth) y luego `npm run google:auth`.')
})

bot.command('gmail', async (ctx) => {
  const n = parseInt(ctx.match?.trim() ?? '10', 10) || 10
  await ctx.reply(`📥 Sincronizando los últimos ${n} correos al Brain…`)
  try {
    const r = await withTyping(ctx, syncGmailToBrain(n))
    await ctx.reply(`✅ ${r.nuevos} correo(s) nuevo(s) absorbido(s) (de ${r.total} revisados). Ya son parte del conocimiento.`)
  } catch (err) {
    await ctx.reply(`⚠️ ${String(err).slice(0, 300)}`)
  }
})

bot.command('drive', async (ctx) => {
  const consulta = ctx.match?.trim()
  if (!consulta) return ctx.reply('Uso: /drive <consulta>')
  try {
    const files = await withTyping(ctx, searchDrive(consulta, 8))
    if (!files.length) return ctx.reply(`📁 Nada en Drive para "${consulta}".`)
    await ctx.reply(`📁 Drive:\n\n${files.map((f, i) => `${i + 1}. ${f.nombre}`).join('\n')}\n\nImporta al Brain con: /importar <nombre>`)
  } catch (err) {
    await ctx.reply(`⚠️ ${String(err).slice(0, 300)}`)
  }
})

bot.command('importar', async (ctx) => {
  const consulta = ctx.match?.trim()
  if (!consulta) return ctx.reply('Uso: /importar <consulta o nombre del archivo>')
  try {
    const files = await withTyping(ctx, searchDrive(consulta, 1))
    if (!files.length) return ctx.reply(`📁 No encontré "${consulta}" en Drive.`)
    const r = await withTyping(ctx, importDriveFile(files[0].id))
    await ctx.reply(`📥 Importado al Brain: "${r.titulo}" (${r.chunks} fragmento(s)).`)
  } catch (err) {
    await ctx.reply(`⚠️ ${String(err).slice(0, 300)}`)
  }
})

// ── Mensajes normales → Instruction Router (o agente fijo) ─────────

bot.on('message:text', async (ctx) => {
  const text = ctx.message.text.trim()
  if (!text || text.startsWith('/')) return
  const mode = chatMode.get(ctx.chat.id) ?? 'auto'
  try {
    const respuesta = mode === 'auto'
      ? await withTyping(ctx, runInstruction(text, 'telegram'))
      : await withTyping(ctx, chatWithAgent(mode, text))
    await sendLong(ctx, respuesta)
  } catch (err) {
    await ctx.reply(`⚠️ Error: ${String(err).slice(0, 300)}`)
  }
})

bot.catch((err) => console.error('bot error:', err.error))

// ── Scheduler tick ──────────────────────────────────────────────────

async function notifyOwner(text: string): Promise<void> {
  const chatId = process.env.TELEGRAM_ALLOWED_CHAT_ID?.trim() || (await getSetting('telegram_chat_id'))
  if (!chatId) return
  const clean = text.trim() || '(sin contenido)'
  for (let i = 0; i < clean.length; i += MAX_MSG) {
    await bot.api.sendMessage(chatId, clean.slice(i, i + MAX_MSG)).catch((e) => console.error('notify error:', e))
  }
}

let tickRunning = false
function startScheduler(): void {
  setInterval(async () => {
    if (tickRunning) return
    tickRunning = true
    try {
      await markTick()
      await runDueSchedules((x) => runInstruction(x, 'cron'), notifyOwner)
      await checkRules((x) => runInstruction(x, 'regla'), notifyOwner)
    } catch (err) {
      console.error('scheduler tick error:', err)
    } finally {
      tickRunning = false
    }
  }, 30_000)
  console.log('✓ Scheduler activo (tick cada 30s)')
}

// ── Arranque ────────────────────────────────────────────────────────

async function main() {
  await ensureSettings()
  await bot.api.setMyCommands([
    { command: 'resumen', description: 'Estado del cerebro: KPIs, memoria, pendientes' },
    { command: 'decidir', description: 'Decision Engine: analiza antes de recomendar' },
    { command: 'tareas', description: 'Cron jobs programados' },
    { command: 'reglas', description: 'Centinela: reglas de vigilancia de KPIs' },
    { command: 'acciones', description: 'Acciones pendientes de aprobación' },
    { command: 'ejecutar', description: 'Ejecutar la acción n' },
    { command: 'agentes', description: 'Ver los 9 especialistas' },
    { command: 'agente', description: 'Fijar un especialista' },
    { command: 'auto', description: 'Volver al modo automático (router)' },
    { command: 'buscar', description: 'Buscar en el conocimiento' },
    { command: 'doc', description: 'Guardar conocimiento en el Brain' },
    { command: 'kpi', description: 'Registrar un KPI (nombre valor)' },
    { command: 'gmail', description: 'Sincronizar correos al Brain' },
    { command: 'drive', description: 'Buscar en Google Drive' },
    { command: 'importar', description: 'Importar archivo de Drive al Brain' },
    { command: 'google', description: 'Estado de la conexión Google' },
    { command: 'help', description: 'Ayuda' },
  ]).catch(() => {})
  const me = await bot.api.getMe()
  console.log(`✓ Business OS bot @${me.username} en línea (long polling)`)
  startScheduler()
  await bot.start()
}

main().catch((err) => { console.error('FATAL:', err); process.exit(1) })
