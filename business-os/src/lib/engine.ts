/**
 * Motores compartidos del Business OS — usados por las API routes (web)
 * y por el bot de Telegram. Un solo cerebro, múltiples canales.
 */
import { q } from './db'
import { askClaude, askClaudeJSON } from './ai'
import { buildBrainContext, recordMemory } from './brain'
import { audit, type Canal } from './audit'

// ── Decision Engine ─────────────────────────────────────────────────

export interface Analisis {
  resumen: string
  lentes: Array<{ lente: string; analisis: string; datos_usados: string[]; datos_faltantes: string[] }>
  riesgos: string[]
  oportunidades: string[]
  recomendacion: string
  condiciones: string[]
  confianza: number
  acciones_sugeridas: Array<{ tipo: string; titulo: string; detalle: string }>
}

export async function runDecision(pregunta: string, canal: Canal = 'web', modo: 'decision' | 'simulacion' = 'decision'): Promise<{ id: string; analisis: Analisis }> {
  const preguntaDb = modo === 'simulacion' ? `🧪 SIMULACIÓN: ${pregunta}` : pregunta
  const [row] = await q<{ id: string }>(`INSERT INTO bo_decisions (pregunta) VALUES ($1) RETURNING id`, [preguntaDb])
  await audit(canal, modo === 'simulacion' ? 'simulacion' : 'decision', pregunta)

  const enfoque = modo === 'simulacion'
    ? `SIMULA el escenario ANTES de que ocurra. Usa como lentes exactamente estos escenarios: "escenario base" (todo sigue igual), "escenario optimista" (sale bien), "escenario pesimista" (sale mal), "punto de quiebre" (en qué condición el resultado se invierte), más 1-2 lentes de sensibilidad sobre los KPIs más afectados. En cada escenario proyecta el impacto NUMÉRICO sobre los KPIs del Brain cuando los datos lo permitan, declarando supuestos en "datos_usados".`
    : `Analiza la decisión pasándola por las lentes RELEVANTES (elige 5 a 8): ventas, flujo de caja, margen, capacidad operativa, personas/productividad, pipeline, crecimiento esperado, riesgos, estacionalidad, historial de decisiones.`

  try {
    const contexto = await buildBrainContext({ topic: pregunta })

    const analisis = await askClaudeJSON<Analisis>(
      `Eres el ${modo === 'simulacion' ? 'SIMULATION ENGINE' : 'DECISION ENGINE'} de un Business OS: el sistema operativo inteligente de una empresa.
No eres un chatbot. No respondes: PIENSAS. Analizas la empresa completa antes de recomendar.

CONTEXTO COMPLETO DE LA EMPRESA (Enterprise Brain):
${contexto}

${modo === 'simulacion' ? 'ESCENARIO A SIMULAR' : 'DECISIÓN A EVALUAR'}:
"${pregunta}"

${enfoque}

Reglas estrictas:
- NUNCA fabriques datos. Si el Brain no tiene el dato, decláralo en "datos_faltantes".
- Si faltan datos críticos, baja la "confianza" y dilo en la recomendación.
- Sé directo, concreto y accionable. Sin adulación.

Responde con este JSON exacto:
{
  "resumen": "síntesis de la situación en 2-3 frases",
  "lentes": [{"lente": "nombre", "analisis": "análisis concreto", "datos_usados": ["..."], "datos_faltantes": ["..."]}],
  "riesgos": ["..."],
  "oportunidades": ["..."],
  "recomendacion": "recomendación clara y directa con pasos",
  "condiciones": ["condición bajo la cual la recomendación cambia"],
  "confianza": 0-100,
  "acciones_sugeridas": [{"tipo": "email|reunion|tarea|documento|reporte|notificacion|otro", "titulo": "...", "detalle": "..."}]
}`,
    )

    await q(`UPDATE bo_decisions SET estado = 'completada', analisis = $1, completed_at = now() WHERE id = $2`,
      [JSON.stringify(analisis), row.id])
    await recordMemory('decision', `${modo === 'simulacion' ? 'Simulación ejecutada' : 'Decisión analizada'}: ${pregunta.slice(0, 120)}`, analisis.recomendacion?.slice(0, 300), row.id)

    const { getPolicies } = await import('./policy')
    const policies = await getPolicies()
    for (const a of analisis.acciones_sugeridas ?? []) {
      const [nueva] = await q<{ id: string }>(
        `INSERT INTO bo_actions (tipo, titulo, detalle, origen, ref_id) VALUES ($1, $2, $3, 'decision', $4) RETURNING id`,
        [a.tipo || 'tarea', a.titulo, a.detalle ?? null, row.id])
      // Política de autonomía: tipos autorizados se ejecutan solos (en segundo plano)
      if (policies.auto_ejecutar.includes(a.tipo)) {
        void executeAction(nueva.id, canal).catch((err) => console.error('auto-exec error:', err))
      }
    }

    return { id: row.id, analisis }
  } catch (err) {
    await q(`UPDATE bo_decisions SET estado = 'error', analisis = $1 WHERE id = $2`,
      [JSON.stringify({ error: String(err) }), row.id])
    throw err
  }
}

// ── Specialized Agents ──────────────────────────────────────────────

export async function chatWithAgent(agentId: string, message: string): Promise<string> {
  const [agent] = await q<{ id: string; nombre: string; rol: string }>(
    `SELECT id, nombre, rol FROM bo_agents WHERE id = $1 AND activo`, [agentId],
  )
  if (!agent) throw new Error(`Agente "${agentId}" no encontrado`)

  const [contexto, history] = await Promise.all([
    buildBrainContext({ topic: message, maxChunks: 6 }),
    q<{ role: string; contenido: string }>(
      `SELECT role, contenido FROM (
         SELECT role, contenido, created_at FROM bo_agent_messages WHERE agent_id = $1 ORDER BY created_at DESC LIMIT 12
       ) t ORDER BY created_at ASC`,
      [agentId],
    ),
  ])

  const historial = history.length
    ? `\n\nCONVERSACIÓN PREVIA:\n${history.map((m) => `${m.role === 'user' ? 'Usuario' : agent.nombre}: ${m.contenido}`).join('\n\n')}`
    : ''

  const respuesta = await askClaude(
    `${agent.rol}

Eres un agente especializado de un Business OS. NO eres un chatbot genérico: conoces toda la empresa porque compartes el mismo Enterprise Brain que los demás agentes. Respondes en español, directo, honesto, accionable. Nunca fabricas datos: si el Brain no lo tiene, lo dices y pides el dato.

ENTERPRISE BRAIN (contexto completo de la empresa):
${contexto}${historial}

MENSAJE DEL USUARIO:
${message}

Responde como ${agent.nombre}. No uses herramientas.`,
  )

  await q(`INSERT INTO bo_agent_messages (agent_id, role, contenido) VALUES ($1, 'user', $2)`, [agentId, message])
  await q(`INSERT INTO bo_agent_messages (agent_id, role, contenido) VALUES ($1, 'assistant', $2)`, [agentId, respuesta])
  await recordMemory('conversacion', `${agent.nombre}: ${message.slice(0, 100)}`, respuesta.slice(0, 250))

  return respuesta
}

// ── Automation Engine ───────────────────────────────────────────────

const INSTRUCCION: Record<string, string> = {
  email: 'Redacta el email completo listo para enviar (asunto + cuerpo), profesional y directo.',
  reunion: 'Redacta la convocatoria: objetivo, agenda con tiempos, asistentes sugeridos y resultado esperado.',
  tarea: 'Redacta el brief de la tarea: objetivo, pasos concretos, responsable sugerido, criterio de terminado.',
  documento: 'Redacta el documento completo en markdown, listo para usar.',
  reporte: 'Redacta el reporte en markdown con datos del Brain: situación, hallazgos, riesgos y siguiente paso. Si falta un dato, dilo — nunca lo inventes.',
  notificacion: 'Redacta la notificación breve y clara para el responsable.',
  otro: 'Ejecuta la acción produciendo el mejor entregable de texto posible.',
}

export async function executeAction(id: string, canal: Canal = 'web'): Promise<string> {
  const [action] = await q<{ id: string; tipo: string; titulo: string; detalle: string | null }>(
    `SELECT id, tipo, titulo, detalle FROM bo_actions WHERE id = $1`, [id],
  )
  if (!action) throw new Error('Acción no encontrada')

  try {
    const contexto = await buildBrainContext({ topic: `${action.titulo} ${action.detalle ?? ''}`, maxChunks: 5 })
    let resultado = await askClaude(
      `Eres el AUTOMATION ENGINE de un Business OS. Ejecuta esta acción produciendo el entregable final.

ENTERPRISE BRAIN (contexto de la empresa):
${contexto}

ACCIÓN [${action.tipo}]: ${action.titulo}
DETALLE: ${action.detalle ?? '(sin detalle)'}

${INSTRUCCION[action.tipo] ?? INSTRUCCION.otro}
Responde SOLO con el entregable, en español. No uses herramientas.`,
    )

    // Email aprobado explícitamente (Ejecutar = aprobación) → envío real si hay destinatario y Gmail
    if (action.tipo === 'email') {
      const para = `${action.titulo}\n${action.detalle ?? ''}`.match(/(?:Para:\s*|Email a\s+)([\w.+-]+@[\w-]+\.[\w.]+)/i)?.[1]
      const { isGoogleConnected, sendGmail } = await import('./google')
      if (para && (await isGoogleConnected())) {
        const asunto = action.titulo.replace(/^Email a [^:]+:\s*/i, '').slice(0, 150) || 'Mensaje'
        await sendGmail(para, asunto, resultado)
        await audit(canal, 'email_enviado', `A ${para}: ${asunto} (aprobado desde la cola)`)
        resultado = `✅ ENVIADO a ${para}\n\n${resultado}`
      }
    }

    await q(`UPDATE bo_actions SET estado = 'ejecutada', resultado = $1, executed_at = now() WHERE id = $2`, [resultado, id])
    await recordMemory('accion', `Acción ejecutada: ${action.titulo}`, resultado.slice(0, 250), id)
    await audit(canal, 'accion_ejecutada', `[${action.tipo}] ${action.titulo}`)
    return resultado
  } catch (err) {
    await q(`UPDATE bo_actions SET estado = 'error', resultado = $1 WHERE id = $2`, [String(err), id])
    throw err
  }
}

export async function rejectAction(id: string, canal: Canal = 'web'): Promise<void> {
  const [action] = await q<{ titulo: string }>(`SELECT titulo FROM bo_actions WHERE id = $1`, [id])
  if (!action) throw new Error('Acción no encontrada')
  await q(`UPDATE bo_actions SET estado = 'rechazada' WHERE id = $1`, [id])
  await recordMemory('accion', `Acción rechazada: ${action.titulo}`, undefined, id)
  await audit(canal, 'accion_rechazada', action.titulo)
}

// ── Resumen ejecutivo (compartido por bot y router) ─────────────────

export async function getResumenText(): Promise<string> {
  const [counts] = await q<{ documentos: string; entidades: string; decisiones: string; pendientes: string }>(
    `SELECT (SELECT count(*) FROM bo_documents) AS documentos,
            (SELECT count(*) FROM bo_entities) AS entidades,
            (SELECT count(*) FROM bo_decisions) AS decisiones,
            (SELECT count(*) FROM bo_actions WHERE estado = 'pendiente') AS pendientes`,
  )
  const kpis = await q<{ nombre: string; unidad: string | null; valor: string | null }>(
    `SELECT k.nombre, k.unidad, s.valor::text AS valor FROM bo_kpis k
     LEFT JOIN LATERAL (SELECT valor FROM bo_kpi_snapshots WHERE kpi_id = k.id ORDER BY created_at DESC LIMIT 1) s ON true
     ORDER BY k.nombre LIMIT 10`,
  )
  const memoria = await q<{ tipo: string; titulo: string }>(
    `SELECT tipo, titulo FROM bo_memory ORDER BY created_at DESC LIMIT 5`,
  )
  const kpiTxt = kpis.length ? kpis.map((k) => `• ${k.nombre}: ${k.valor ?? 'sin dato'}${k.unidad ? ` ${k.unidad}` : ''}`).join('\n') : '• (sin KPIs aún)'
  const memTxt = memoria.length ? memoria.map((m) => `• [${m.tipo}] ${m.titulo}`).join('\n') : '• (memoria vacía)'
  return `🧠 Estado del Brain\n\n📚 Documentos: ${counts.documentos} · 🏢 Entidades: ${counts.entidades} · 🎯 Decisiones: ${counts.decisiones} · ⚡ Pendientes: ${counts.pendientes}\n\n📊 KPIs\n${kpiTxt}\n\n🕐 Última actividad\n${memTxt}`
}

// ── Instruction Router ──────────────────────────────────────────────
// El gerente da la orden en lenguaje natural; el Business OS la ejecuta.

interface Intencion {
  intencion: 'decidir' | 'simular' | 'relacionar' | 'reflexionar' | 'roi' | 'doc' | 'kpi' | 'email' | 'accion' | 'programar' | 'regla' | 'gmail_sync' | 'drive_buscar' | 'drive_importar' | 'buscar' | 'resumen' | 'chat'
  pregunta?: string
  titulo?: string; contenido?: string
  nombre?: string; valor?: number
  para?: string | null; asunto?: string; instrucciones?: string
  tipo?: string; detalle?: string
  cron?: string; instruccion?: string
  kpi?: string; condicion?: 'menor' | 'mayor'; umbral?: number
  cantidad?: number; consulta?: string; tema?: string
  agente?: string; mensaje?: string
  origen?: string; relacion?: string; destino?: string; tipo_origen?: string; tipo_destino?: string
  dias?: number
}

export async function interpretInstruction(texto: string): Promise<Intencion> {
  return askClaudeJSON<Intencion>(
    `Eres el INSTRUCTION ROUTER de un Business OS. El dueño de la empresa da una instrucción en lenguaje natural y tú la clasificas en la capacidad correcta. NO la ejecutas: solo clasificas.

INSTRUCCIÓN DEL DUEÑO:
"${texto}"

Capacidades (elige UNA, la que mejor cumpla la instrucción):
- {"intencion":"decidir","pregunta":"..."} — evaluar una decisión de negocio ("¿contratamos...?", "¿conviene...?", "analiza si...")
- {"intencion":"simular","pregunta":"..."} — proyectar escenarios ANTES de actuar ("simula qué pasa si...", "¿qué pasaría si subimos precios 20%?", "proyecta el impacto de...")
- {"intencion":"relacionar","origen":"entidad A","relacion":"trabaja_en|usa|depende_de|compra|provee|gestiona|...","destino":"entidad B","tipo_origen":"persona|cliente|producto|proveedor|proyecto|proceso|contrato|activo|otro","tipo_destino":"..."} — conectar el grafo empresarial ("Juan trabaja en el Proyecto Alfa", "el Proyecto Alfa usa el Servidor B")
- {"intencion":"reflexionar","dias":7} — el Learning Engine analiza la operación reciente y guarda aprendizajes ("aprende de la semana", "reflexiona sobre el mes": dias=30)
- {"intencion":"roi","dias":30} — reporte de retorno: horas y dinero que el OS ha ahorrado ("¿cuánto me has ahorrado?", "dame el ROI del mes", "reporte de valor")
- {"intencion":"doc","titulo":"...","contenido":"..."} — guardar información/notas/datos que el dueño está dictando
- {"intencion":"kpi","nombre":"...","valor":123} — registrar una métrica con valor numérico ("ventas de hoy 4500", "MRR 1568")
- {"intencion":"email","para":"correo@x.com o null si no lo dio","asunto":"...","instrucciones":"qué debe decir el email"} — redactar/enviar un correo
- {"intencion":"accion","tipo":"email|reunion|tarea|documento|reporte|notificacion|otro","titulo":"...","detalle":"..."} — encolar un trabajo para aprobar después
- {"intencion":"programar","nombre":"...","cron":"expresión cron 5 campos","instruccion":"instrucción a ejecutar cada vez"} — automatizar algo recurrente ("todos los días a las 8am...", "cada lunes...")
- {"intencion":"regla","nombre":"...","kpi":"nombre del KPI","condicion":"menor|mayor","umbral":123,"instruccion":"qué hacer al dispararse (opcional)"} — vigilancia por umbral ("si el MRR baja de 1000 avísame", "cuando el stock pase de 50 genera orden")
- {"intencion":"gmail_sync","cantidad":10} — leer/sincronizar los correos recientes al cerebro
- {"intencion":"drive_buscar","consulta":"..."} — buscar archivos en Google Drive
- {"intencion":"drive_importar","consulta":"..."} — importar un archivo de Drive al cerebro
- {"intencion":"buscar","tema":"..."} — buscar en el conocimiento interno de la empresa
- {"intencion":"resumen"} — estado general de la empresa ("¿cómo vamos?", "dame el estado")
- {"intencion":"chat","agente":"ceo|finanzas|rrhh|ventas|operaciones|marketing|legal|soporte|analytics","mensaje":"..."} — conversación, consejo u opinión (elige el especialista más apto)

Para "programar", convierte horarios a cron (5 campos, minuto hora día-mes mes día-semana). Ej: "todos los días a las 8am" → "0 8 * * *", "cada lunes a las 9" → "0 9 * * 1".`,
  )
}

export async function runInstruction(texto: string, canal: Canal = 'sistema'): Promise<string> {
  const it = await interpretInstruction(texto)

  switch (it.intencion) {
    case 'decidir': {
      const { analisis } = await runDecision(it.pregunta || texto, canal)
      return `🎯 Decisión analizada (confianza ${analisis.confianza}%)\n\n${analisis.resumen}\n\n✅ RECOMENDACIÓN\n${analisis.recomendacion}${analisis.acciones_sugeridas?.length ? `\n\n⚡ ${analisis.acciones_sugeridas.length} acción(es) encolada(s)` : ''}`
    }
    case 'simular': {
      const { analisis } = await runDecision(it.pregunta || texto, canal, 'simulacion')
      const escenarios = analisis.lentes?.map((l) => `▸ ${l.lente.toUpperCase()}\n${l.analisis}`).join('\n\n') ?? ''
      return `🧪 Simulación completada (confianza ${analisis.confianza}%)\n\n${analisis.resumen}\n\n${escenarios}\n\n✅ RECOMENDACIÓN\n${analisis.recomendacion}`
    }
    case 'relacionar': {
      const { linkEntities } = await import('./graph')
      if (!it.origen || !it.relacion || !it.destino) return '⚠️ Necesito origen, relación y destino. Ej: "Juan trabaja en el Proyecto Alfa"'
      const r = await linkEntities(it.origen, it.relacion, it.destino, it.tipo_origen || 'otro', it.tipo_destino || 'otro')
      return `🕸️ Grafo actualizado: ${r.origen} —${r.relacion}→ ${r.destino}${r.nuevas.length ? `\nEntidades nuevas creadas: ${r.nuevas.join(', ')}` : ''}`
    }
    case 'reflexionar': {
      const { runReflection } = await import('./learning')
      const resultado = await runReflection(it.dias ?? 7)
      await audit(canal, 'reflexion', `Período: ${it.dias ?? 7} días`)
      return resultado
    }
    case 'roi': {
      const { getRoiText } = await import('./roi')
      return getRoiText(it.dias ?? 30)
    }
    case 'doc': {
      const { ingestDocument } = await import('./knowledge')
      const r = await ingestDocument(it.titulo || texto.slice(0, 60), 'instruccion', it.contenido || texto)
      return `📚 Guardado en el Brain: "${it.titulo || texto.slice(0, 60)}" (${r.chunks} fragmento(s))`
    }
    case 'kpi': {
      if (!it.nombre || typeof it.valor !== 'number') return '⚠️ No identifiqué el KPI y su valor. Ej: "registra ventas de hoy 4500"'
      const [kpi] = await q<{ id: string }>(
        `INSERT INTO bo_kpis (nombre) VALUES ($1) ON CONFLICT (nombre) DO UPDATE SET nombre = $1 RETURNING id`, [it.nombre],
      )
      await q(`INSERT INTO bo_kpi_snapshots (kpi_id, valor) VALUES ($1, $2)`, [kpi.id, it.valor])
      await recordMemory('evento', `KPI actualizado: ${it.nombre} = ${it.valor}`, 'vía instrucción')
      return `📊 ${it.nombre} = ${it.valor} registrado.`
    }
    case 'email': {
      const { isGoogleConnected, sendGmail } = await import('./google')
      const { getPolicies } = await import('./policy')
      const contexto = await buildBrainContext({ topic: it.instrucciones || texto, maxChunks: 4 })
      const draft = await askClaudeJSON<{ asunto: string; cuerpo: string }>(
        `Redacta un email profesional en español para el siguiente encargo. Contexto de la empresa:\n${contexto.slice(0, 6000)}\n\nENCARGO: ${it.instrucciones || texto}\n${it.asunto ? `Asunto sugerido: ${it.asunto}` : ''}\n\nJSON: {"asunto":"...","cuerpo":"..."}`,
      )
      const policies = await getPolicies()
      if (it.para && policies.email_auto && (await isGoogleConnected())) {
        await sendGmail(it.para, draft.asunto, draft.cuerpo)
        await q(`INSERT INTO bo_actions (tipo, titulo, detalle, estado, resultado, origen, executed_at) VALUES ('email', $1, $2, 'ejecutada', $3, 'instruccion', now())`,
          [`Email a ${it.para}: ${draft.asunto}`, `Para: ${it.para}\n${it.instrucciones ?? ''}`, draft.cuerpo])
        await recordMemory('accion', `Email enviado a ${it.para}: ${draft.asunto}`, draft.cuerpo.slice(0, 250))
        await audit(canal, 'email_enviado', `A ${it.para}: ${draft.asunto}`)
        return `✉️ Enviado a ${it.para}\n\nAsunto: ${draft.asunto}\n\n${draft.cuerpo}`
      }
      await q(`INSERT INTO bo_actions (tipo, titulo, detalle, resultado, origen) VALUES ('email', $1, $2, $3, 'instruccion')`,
        [`Email${it.para ? ` a ${it.para}` : ''}: ${draft.asunto}`, it.para ? `Para: ${it.para}\n${it.instrucciones ?? ''}` : it.instrucciones ?? null, draft.cuerpo])
      const motivo = !it.para
        ? 'falta el destinatario'
        : !policies.email_auto
          ? 'política: los emails requieren tu aprobación — al Ejecutar se envía de verdad'
          : 'Gmail no está conectado (npm run google:auth)'
      return `✉️ Borrador listo y encolado en Acciones (${motivo}):\n\nAsunto: ${draft.asunto}\n\n${draft.cuerpo}`
    }
    case 'accion': {
      await q(`INSERT INTO bo_actions (tipo, titulo, detalle, origen) VALUES ($1, $2, $3, 'instruccion')`,
        [it.tipo || 'tarea', it.titulo || texto.slice(0, 120), it.detalle ?? null])
      return `⚡ Encolada: "${it.titulo || texto.slice(0, 120)}". Apruébala con /acciones → /ejecutar`
    }
    case 'programar': {
      const { createSchedule } = await import('./scheduler')
      if (!it.cron || !it.instruccion) return '⚠️ No pude armar el cron. Dame horario claro, ej: "todos los días a las 8am mándame el resumen"'
      const s = await createSchedule(it.nombre || it.instruccion.slice(0, 60), it.cron, it.instruccion)
      await audit(canal, 'cron_creado', `${s.nombre} (${s.cron}) → ${s.instruccion}`)
      return `⏰ Programado: "${s.nombre}" (${s.cron})\nPróxima ejecución: ${s.next_run?.toLocaleString('es-MX') ?? '?'}\nInstrucción: ${s.instruccion}`
    }
    case 'regla': {
      const { createRule } = await import('./rules')
      if (!it.kpi || !it.condicion || typeof it.umbral !== 'number') {
        return '⚠️ No identifiqué la regla. Ej: "si el MRR baja de 1000 avísame" (necesito KPI, condición y umbral)'
      }
      try {
        const r = await createRule({
          nombre: it.nombre || `${it.kpi} ${it.condicion === 'menor' ? '<' : '>'} ${it.umbral}`,
          kpiNombre: it.kpi,
          condicion: it.condicion,
          umbral: it.umbral,
          instruccion: it.instruccion,
        })
        await audit(canal, 'regla_creada', `${r.nombre}${r.instruccion ? ` → ${r.instruccion}` : ''}`)
        return `🛡️ Centinela activo: "${r.nombre}"\nVigilando ${r.kpi_nombre} — se dispara si es ${it.condicion === 'menor' ? 'menor' : 'mayor'} que ${it.umbral}.${r.instruccion ? `\nAl dispararse: ${r.instruccion}` : '\nAl dispararse: te aviso por Telegram.'}`
      } catch (err) {
        return `⚠️ ${String(err instanceof Error ? err.message : err)}`
      }
    }
    case 'gmail_sync': {
      const { syncGmailToBrain } = await import('./google')
      const r = await syncGmailToBrain(it.cantidad ?? 10)
      return `📥 Gmail sincronizado: ${r.nuevos} correo(s) nuevo(s) absorbido(s) al Brain (de ${r.total} revisados).`
    }
    case 'drive_buscar': {
      const { searchDrive } = await import('./google')
      const files = await searchDrive(it.consulta || texto, 8)
      if (!files.length) return `📁 Nada en Drive para "${it.consulta}".`
      return `📁 Drive:\n${files.map((f, i) => `${i + 1}. ${f.nombre} (${f.mime.split('.').pop()})`).join('\n')}\n\nImporta con: "importa de drive ${files[0].nombre}"`
    }
    case 'drive_importar': {
      const { searchDrive, importDriveFile } = await import('./google')
      const files = await searchDrive(it.consulta || texto, 1)
      if (!files.length) return `📁 No encontré "${it.consulta}" en Drive.`
      const r = await importDriveFile(files[0].id)
      return `📥 Importado de Drive al Brain: "${r.titulo}" (${r.chunks} fragmento(s)).`
    }
    case 'buscar': {
      const { searchKnowledge } = await import('./brain')
      const results = await searchKnowledge(it.tema || texto, 5)
      if (!results.length) return 'El Brain no tiene nada sobre eso todavía.'
      return results.map((r) => `📄 ${r.titulo}\n${r.contenido.slice(0, 300)}`).join('\n\n———\n\n')
    }
    case 'resumen':
      return getResumenText()
    case 'chat':
    default:
      return chatWithAgent(it.agente && ['ceo','finanzas','rrhh','ventas','operaciones','marketing','legal','soporte','analytics'].includes(it.agente) ? it.agente : 'ceo', it.mensaje || texto)
  }
}
