/**
 * Script para inicializar el Business OS a partir de un Pack Vertical (semilla).
 * Uso: npx tsx scripts/seed-pack.ts packs/saas.json
 */
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'

const __dir = dirname(fileURLToPath(import.meta.url))
config({ path: join(__dir, '..', '.env.local') })

import { applyOnboarding, Propuesta } from '../src/lib/onboarding'

async function main() {
  const packPath = process.argv[2]
  if (!packPath) {
    console.error('Uso: npx tsx scripts/seed-pack.ts <ruta-al-pack.json>')
    process.exit(1)
  }

  const fullPath = join(process.cwd(), packPath)
  if (!existsSync(fullPath)) {
    console.error(`No se encontró el archivo: ${fullPath}`)
    process.exit(1)
  }

  console.log(`Leyendo pack vertical: ${packPath}...`)
  const packData = JSON.parse(readFileSync(fullPath, 'utf8')) as Propuesta

  console.log(`Fundando el Business OS para: ${packData.empresa}...`)
  
  const stats = await applyOnboarding(packData)
  
  console.log('\n✓ Business OS Encendido Exitosamente.')
  console.log('--- Resumen de Ingesta ---')
  console.log(`- Constitución v${stats.version}`)
  console.log(`- ${stats.entidades} Entidades agregadas al Grafo`)
  console.log(`- ${stats.kpis} KPIs configurados`)
  console.log(`- ${stats.crons} Automatizaciones programadas`)
  
  process.exit(0)
}

main().catch((err) => {
  console.error('✗ Error ingiriendo el pack:', err.message)
  process.exit(1)
})
