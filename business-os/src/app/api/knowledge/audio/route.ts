import { NextRequest, NextResponse } from 'next/server'
import { ingestDocument } from '@/lib/knowledge'
import { audit } from '@/lib/audit'

// Usamos la API key de Groq que debería estar en el .env.local del business-os o compartida
const GROQ_API_KEY = process.env.GROQ_API_KEY

export async function POST(req: NextRequest) {
  try {
    if (!GROQ_API_KEY) {
      return NextResponse.json({ error: 'Falta GROQ_API_KEY en las variables de entorno' }, { status: 500 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    const titulo = (formData.get('titulo') as string) || file.name.replace(/\.[^.]+$/, '')

    if (!file) {
      return NextResponse.json({ error: 'No se encontró el archivo de audio' }, { status: 400 })
    }

    // Preparar el FormData para Groq
    const groqFormData = new FormData()
    // Groq requiere un archivo en un formato soportado, whisper acepta mp3, mp4, mpeg, mpga, m4a, wav, y webm
    groqFormData.set('file', file, file.name)
    groqFormData.set('model', 'whisper-large-v3')
    groqFormData.set('response_format', 'json')
    groqFormData.set('language', 'es') // Opcional, pero ayuda si sabemos que es español

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
      body: groqFormData,
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`Groq STT error ${response.status}: ${body}`)
    }

    const data = (await response.json()) as { text: string }
    const transcript = data.text

    if (!transcript || transcript.trim() === '') {
      return NextResponse.json({ error: 'No se detectó habla en el audio' }, { status: 400 })
    }

    // Ingestar al Enterprise Brain
    const r = await ingestDocument(
      `${titulo} (Transcripción de Audio)`,
      'reunion',
      transcript
    )

    await audit('web', 'audio_transcribed', `Se transcribió y absorbió el audio: ${titulo}`)

    return NextResponse.json({ ok: true, id: r.id, chunks: r.chunks, caracteres: transcript.length })
  } catch (error) {
    console.error('STT Error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
