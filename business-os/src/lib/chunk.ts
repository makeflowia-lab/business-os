/** Divide texto en chunks de ~1200 caracteres respetando párrafos. */
export function chunkText(text: string, maxLen = 1200): string[] {
  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
  const chunks: string[] = []
  let current = ''

  for (const p of paragraphs) {
    if (p.length > maxLen) {
      if (current) { chunks.push(current); current = '' }
      // Párrafo gigante: cortar por oraciones
      let piece = ''
      for (const sentence of p.split(/(?<=[.!?])\s+/)) {
        if ((piece + ' ' + sentence).length > maxLen && piece) { chunks.push(piece.trim()); piece = '' }
        piece = piece ? piece + ' ' + sentence : sentence
      }
      if (piece.trim()) chunks.push(piece.trim())
      continue
    }
    if ((current + '\n\n' + p).length > maxLen && current) {
      chunks.push(current)
      current = p
    } else {
      current = current ? current + '\n\n' + p : p
    }
  }
  if (current) chunks.push(current)
  return chunks
}
