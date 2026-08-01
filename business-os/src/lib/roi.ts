/**
 * Panel de ROI — el número que hace renovar al empresario.
 * Estima horas ahorradas por cada operación del OS y las convierte a dinero
 * con el valor-hora configurable (bo_settings 'valor_hora', default 20 USD).
 * Contra el hallazgo del MIT: el 95% de pilotos de IA no muestran impacto en
 * el P&L — este panel lo muestra, con estimaciones declaradas.
 */
import { q } from './db'
import { getSetting, setSetting } from './knowledge'

// Horas ahorradas estimadas por operación (conservadoras, declaradas en la UI)
const HORAS: Record<string, number> = {
  email: 0.4, reunion: 0.3, tarea: 0.5, documento: 1.0, reporte: 1.5, notificacion: 0.2, otro: 0.5,
  decision: 2.0, simulacion: 2.5, doc_ingerido: 0.2, consulta_agente: 0.15, cron: 0.5,
}

export interface RoiDesglose { concepto: string; cantidad: number; horas: number }
export interface Roi {
  dias: number
  valorHora: number
  totalHoras: number
  totalValor: number
  desglose: RoiDesglose[]
}

export async function getValorHora(): Promise<number> {
  const v = Number(await getSetting('valor_hora'))
  return isNaN(v) || v <= 0 ? 20 : v
}

export async function setValorHora(valor: number): Promise<void> {
  await setSetting('valor_hora', String(valor))
}

export async function computeROI(dias = 30): Promise<Roi> {
  const [acciones, decisiones, docs, consultas, crons, valorHora] = await Promise.all([
    q<{ tipo: string; n: string }>(
      `SELECT tipo, count(*) AS n FROM bo_actions
        WHERE estado = 'ejecutada' AND executed_at > now() - make_interval(days => $1)
        GROUP BY tipo`, [dias],
    ),
    q<{ sim: boolean; n: string }>(
      `SELECT (pregunta LIKE '🧪%') AS sim, count(*) AS n FROM bo_decisions
        WHERE estado = 'completada' AND created_at > now() - make_interval(days => $1)
        GROUP BY 1`, [dias],
    ),
    q<{ n: string }>(`SELECT count(*) AS n FROM bo_documents WHERE created_at > now() - make_interval(days => $1)`, [dias]),
    q<{ n: string }>(`SELECT count(*) AS n FROM bo_agent_messages WHERE role = 'assistant' AND created_at > now() - make_interval(days => $1)`, [dias]),
    q<{ n: string }>(`SELECT count(*) AS n FROM bo_memory WHERE titulo LIKE 'Cron ejecutado:%' AND created_at > now() - make_interval(days => $1)`, [dias]),
    getValorHora(),
  ])

  const LABEL: Record<string, string> = {
    email: '✉ Emails redactados/enviados', reunion: '◷ Convocatorias preparadas', tarea: '✓ Briefs de tarea',
    documento: '▤ Documentos producidos', reporte: '▥ Reportes generados', notificacion: '◉ Notificaciones', otro: '⚡ Otras acciones',
  }

  const desglose: RoiDesglose[] = []
  for (const a of acciones) {
    const n = Number(a.n)
    if (n > 0) desglose.push({ concepto: LABEL[a.tipo] ?? `⚡ ${a.tipo}`, cantidad: n, horas: n * (HORAS[a.tipo] ?? 0.5) })
  }
  for (const d of decisiones) {
    const n = Number(d.n)
    if (n > 0) desglose.push({
      concepto: d.sim ? '🧪 Simulaciones de escenarios' : '🎯 Decisiones analizadas',
      cantidad: n,
      horas: n * (d.sim ? HORAS.simulacion : HORAS.decision),
    })
  }
  const nDocs = Number(docs[0]?.n ?? 0)
  if (nDocs > 0) desglose.push({ concepto: '▤ Conocimiento organizado', cantidad: nDocs, horas: nDocs * HORAS.doc_ingerido })
  const nCons = Number(consultas[0]?.n ?? 0)
  if (nCons > 0) desglose.push({ concepto: '⌬ Consultas a especialistas', cantidad: nCons, horas: nCons * HORAS.consulta_agente })
  const nCrons = Number(crons[0]?.n ?? 0)
  if (nCrons > 0) desglose.push({ concepto: '⏱ Automatizaciones ejecutadas', cantidad: nCrons, horas: nCrons * HORAS.cron })

  desglose.sort((a, b) => b.horas - a.horas)
  const totalHoras = desglose.reduce((s, d) => s + d.horas, 0)

  return {
    dias,
    valorHora,
    totalHoras: Math.round(totalHoras * 10) / 10,
    totalValor: Math.round(totalHoras * valorHora),
    desglose: desglose.map((d) => ({ ...d, horas: Math.round(d.horas * 10) / 10 })),
  }
}

/** Versión texto para chat (WhatsApp/Telegram/JARVIS). */
export async function getRoiText(dias = 30): Promise<string> {
  const r = await computeROI(dias)
  if (r.desglose.length === 0) {
    return `💰 ROI (últimos ${dias} días): aún sin operaciones registradas. Usa el sistema — cada acción, decisión y automatización suma aquí.`
  }
  const lineas = r.desglose.map((d) => `• ${d.concepto}: ${d.cantidad} → ~${d.horas} h`).join('\n')
  return `💰 ROI — últimos ${dias} días\n\n⏱ Horas recuperadas: ~${r.totalHoras} h\n💵 Valor estimado: ~$${r.totalValor.toLocaleString()} (a $${r.valorHora}/h)\n\n${lineas}\n\n(Estimaciones conservadoras por operación; ajusta tu valor-hora en la página ROI.)`
}
