import { Pool } from 'pg'

declare global {
  // eslint-disable-next-line no-var
  var __boPool: Pool | undefined
}

function createPool(): Pool {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL no está definida')
  const pool = new Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    max: 5,
    // Neon suspende DBs inactivas y mata conexiones — reciclar rápido
    idleTimeoutMillis: 10_000,
    // Neon puede tardar en "despertar" del suspend: dar margen al connect
    connectionTimeoutMillis: 15_000,
    keepAlive: true,
  })
  // Sin este handler, un error en un cliente idle (ECONNRESET/ENOTFOUND) TUMBA el proceso
  pool.on('error', (err) => {
    console.error('pg pool error (conexión reciclada):', err.message)
  })
  return pool
}

export function getPool(): Pool {
  if (!global.__boPool) {
    global.__boPool = createPool()
  }
  return global.__boPool
}

/** Fuerza destruir el pool actual (para reconectar tras errores de auth/red) */
async function resetPool(): Promise<void> {
  if (global.__boPool) {
    await global.__boPool.end().catch(() => {})
    global.__boPool = undefined
  }
}

// Errores por los que vale la pena reciclar el pool y reintentar (no son fallos de la query):
// - 08P01 "Authentication timed out" — Neon mató la conexión idle
// - ECONNRESET/ENOTFOUND/ETIMEDOUT — red caída o DNS fail
// - "Connection terminated…" / "connection timeout" — Neon despertando del suspend (cold start)
function esReintentable(err: unknown): boolean {
  const e = err as { code?: string; message?: string }
  return (
    e.code === '08P01' ||
    /ECONNRESET|ENOTFOUND|ETIMEDOUT|connection terminated|connection timeout|authentication timed out/i.test(e.message ?? '')
  )
}

export async function q<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  let ultimoError: unknown
  // Hasta 3 intentos con backoff: cubre el arranque en frío de Neon (puede tardar unos segundos)
  for (let intento = 0; intento < 3; intento++) {
    try {
      const { rows } = await getPool().query(sql, params)
      return rows as T[]
    } catch (err: unknown) {
      ultimoError = err
      if (!esReintentable(err)) throw err
      const msg = (err as { message?: string }).message
      console.warn(`pg: conexión no lista (intento ${intento + 1}/3), reciclando pool…`, msg)
      await resetPool()
      // Backoff creciente para darle a Neon tiempo de despertar antes del siguiente intento
      if (intento < 2) await new Promise((r) => setTimeout(r, 800 * (intento + 1)))
    }
  }
  throw ultimoError
}
