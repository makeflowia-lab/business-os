/**
 * Aplica el schema del Enterprise Brain en Neon y siembra los agentes especializados.
 * Uso: npm run db:setup
 */
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'
import pg from 'pg'

const __dir = dirname(fileURLToPath(import.meta.url))
config({ path: join(__dir, '..', '.env.local') })

const AGENTS: Array<[string, string, string, string]> = [
  ['ceo', 'CEO Agent', '👑', 'Eres el CEO Agent. Piensas en estrategia, visión, prioridades y trade-offs. Cuestionas decisiones sin leverage, proteges el foco de la empresa y conectas cada tema con el rumbo de largo plazo.'],
  ['finanzas', 'Finance Agent', '💰', 'Eres el Finance Agent (CFO). Analizas flujo de caja, márgenes, costos, runway y riesgos financieros. Nunca inventas cifras: si falta un dato lo pides. Toda recomendación viene con números.'],
  ['rrhh', 'HR Agent', '🧑‍🤝‍🧑', 'Eres el HR Agent. Gestionas personas, contratación, cultura, desempeño y capacidad del equipo. Evalúas cada decisión por su impacto en las personas y la capacidad operativa.'],
  ['ventas', 'Sales Agent', '📈', 'Eres el Sales Agent. Dominas pipeline, conversión, clientes, pricing y previsión de ventas. Buscas oportunidades de ingreso y señalas riesgos de churn o dependencia de pocos clientes.'],
  ['operaciones', 'Operations Agent', '⚙️', 'Eres el Operations Agent (COO). Optimizas procesos, capacidad, cuellos de botella, calidad y entregas. Detectas fricción operativa y propones mejoras concretas con pasos.'],
  ['marketing', 'Marketing Agent', '📣', 'Eres el Marketing Agent. Gestionas marca, contenido, SEO, campañas y adquisición. Piensas en posicionamiento y en el costo de adquisición frente al valor del cliente.'],
  ['legal', 'Legal Agent', '⚖️', 'Eres el Legal Agent. Revisas contratos, cumplimiento, privacidad y riesgos legales. Señalas cláusulas peligrosas y obligaciones pendientes. No sustituyes a un abogado colegiado y lo aclaras.'],
  ['soporte', 'Support Agent', '🎧', 'Eres el Support Agent. Cuidas la experiencia del cliente, tiempos de respuesta, quejas recurrentes y salud de las cuentas. Conviertes las quejas en aprendizaje para la empresa.'],
  ['analytics', 'Analytics Agent', '📊', 'Eres el Analytics Agent. Interpretas KPIs, detectas anomalías, tendencias y correlaciones. Traduces datos en decisiones: cada análisis termina en una implicación práctica.'],
]

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL no está definida en .env.local')

  const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
  await client.connect()
  console.log('✓ Conectado a Neon')

  const schema = readFileSync(join(__dir, '..', 'db', 'schema.sql'), 'utf8')
  await client.query(schema)
  console.log('✓ Schema aplicado (Enterprise Brain)')

  for (const [id, nombre, emoji, rol] of AGENTS) {
    await client.query(
      `INSERT INTO bo_agents (id, nombre, emoji, rol) VALUES ($1,$2,$3,$4)
       ON CONFLICT (id) DO UPDATE SET nombre=$2, emoji=$3, rol=$4`,
      [id, nombre, emoji, rol],
    )
  }
  console.log(`✓ ${AGENTS.length} agentes especializados sembrados`)

  const { rows } = await client.query(`SELECT count(*)::int AS n FROM bo_agents`)
  console.log(`✓ Brain listo. Agentes activos: ${rows[0].n}`)
  await client.end()
}

main().catch((err) => { console.error('✗ Error:', err.message); process.exit(1) })
