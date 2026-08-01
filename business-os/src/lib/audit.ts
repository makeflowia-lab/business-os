import { q } from './db'

export type Canal = 'web' | 'telegram' | 'whatsapp' | 'cron' | 'regla' | 'sistema'

/** Capa de Gobierno: registro inmutable de operaciones sensibles (quién=dueño, qué, cuándo, por qué canal). */
export async function audit(canal: Canal, evento: string, detalle?: string): Promise<void> {
  try {
    await q(`INSERT INTO bo_audit (canal, evento, detalle) VALUES ($1, $2, $3)`, [canal, evento, detalle?.slice(0, 1000) ?? null])
  } catch (err) {
    console.error('audit error:', err)
  }
}

export async function listAudit(limit = 200): Promise<Array<{ canal: string; evento: string; detalle: string | null; created_at: Date }>> {
  return q(`SELECT canal, evento, detalle, created_at FROM bo_audit ORDER BY created_at DESC LIMIT $1`, [limit])
}
