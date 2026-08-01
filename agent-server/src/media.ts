import { writeFileSync, readdirSync, statSync, unlinkSync } from 'fs'
import { join, extname } from 'path'
import { UPLOADS_DIR, TELEGRAM_BOT_TOKEN } from './config.js'
import { logger } from './logger.js'

/**
 * Descarga un archivo de Telegram al directorio de uploads.
 * Retorna el path local del archivo descargado.
 */
export async function downloadMedia(fileId: string, originalFilename?: string): Promise<string> {
  // 1. Obtener file_path de Telegram
  const fileInfoRes = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`
  )
  const fileInfo = (await fileInfoRes.json()) as { ok: boolean; result?: { file_path: string } }

  if (!fileInfo.ok || !fileInfo.result?.file_path) {
    throw new Error(`getFile failed for fileId ${fileId}`)
  }

  const remotePath = fileInfo.result.file_path
  const ext = extname(remotePath) || (originalFilename ? extname(originalFilename) : '')

  // 2. Descargar el archivo
  const downloadRes = await fetch(
    `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${remotePath}`
  )

  if (!downloadRes.ok) {
    throw new Error(`download failed: ${downloadRes.status}`)
  }

  // 3. Sanitizar nombre: solo [a-zA-Z0-9._-]
  const rawName = originalFilename ?? remotePath.split('/').pop() ?? 'file'
  const sanitized = rawName.replace(/[^a-zA-Z0-9._-]/g, '-')
  const localPath = join(UPLOADS_DIR, `${Date.now()}_${sanitized}${ext && !sanitized.includes('.') ? ext : ''}`)

  const buffer = await downloadRes.arrayBuffer()
  writeFileSync(localPath, Buffer.from(buffer))

  logger.debug({ localPath, bytes: buffer.byteLength }, 'media downloaded')
  return localPath
}

/**
 * Construye el mensaje para Claude cuando se envía una foto.
 */
export function buildPhotoMessage(localPath: string, caption?: string): string {
  const lines = [`Analyze this image: ${localPath}`]
  if (caption) lines.push(`Caption: ${caption}`)
  return lines.join('\n')
}

/**
 * Construye el mensaje para Claude cuando se envía un documento.
 */
export function buildDocumentMessage(localPath: string, filename: string, caption?: string): string {
  const lines = [`Read and analyze this file: ${localPath} (filename: ${filename})`]
  if (caption) lines.push(`Caption: ${caption}`)
  return lines.join('\n')
}

/**
 * Limpia uploads más viejos que maxAgeMs (default: 24h).
 * Llamado en startup.
 */
export function cleanupOldUploads(maxAgeMs = 24 * 60 * 60 * 1000): void {
  try {
    const now = Date.now()
    const files = readdirSync(UPLOADS_DIR)
    let cleaned = 0

    for (const file of files) {
      const filePath = join(UPLOADS_DIR, file)
      const stat = statSync(filePath)
      if (now - stat.mtimeMs > maxAgeMs) {
        unlinkSync(filePath)
        cleaned++
      }
    }

    if (cleaned > 0) {
      logger.info({ cleaned }, 'old uploads cleaned')
    }
  } catch {
    // UPLOADS_DIR puede no existir aún en primer arranque — no es error
  }
}
