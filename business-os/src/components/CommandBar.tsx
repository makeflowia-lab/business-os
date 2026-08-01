'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@/lib/client'
import { Spinner, Typewriter, FeedbackButtons } from '@/components/ui'

/* Tipos mínimos para Web Speech API (no están en lib.dom por defecto) */
type SR = {
  lang: string; interimResults: boolean; continuous: boolean
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null
  onend: (() => void) | null
  onerror: ((e: unknown) => void) | null
  start: () => void; stop: () => void; abort: () => void
}

function getSR(): (new () => SR) | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

/** Limpia el texto para la voz: fuera emojis, símbolos HUD y markdown. */
function paraVoz(text: string): string {
  return text
    .replace(/[\p{Extended_Pictographic}←-⇿⌀-➿⬀-⯿▸◢◉⟨⟩▦≡§⛨│┃—]/gu, ' ')
    .replace(/[*#`_]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 1400)
}

export function CommandBar() {
  const [texto, setTexto] = useState('')
  const [running, setRunning] = useState(false)
  const [resultado, setResultado] = useState('')
  const [ultimaOrden, setUltimaOrden] = useState('')
  const [listening, setListening] = useState(false)
  const [voiceMode, setVoiceMode] = useState(false)   // conversación continua manos libres
  const [speakOn, setSpeakOn] = useState(true)        // respuestas habladas
  const [supported, setSupported] = useState(false)

  const recRef = useRef<SR | null>(null)
  const voiceModeRef = useRef(false)
  const speakOnRef = useRef(true)
  const runningRef = useRef(false)
  const textoRef = useRef('')
  voiceModeRef.current = voiceMode
  speakOnRef.current = speakOn
  runningRef.current = running
  textoRef.current = texto

  useEffect(() => { setSupported(!!getSR()) }, [])

  const speak = useCallback((text: string, onDone?: () => void) => {
    if (!speakOnRef.current || typeof window === 'undefined' || !('speechSynthesis' in window)) { onDone?.(); return }
    const u = new SpeechSynthesisUtterance(paraVoz(text))
    u.lang = 'es-MX'
    u.rate = 1.07
    u.pitch = 0.92
    const pick = () => {
      const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('es'))
      const pref = voices.find((v) => /google|microsoft/i.test(v.name) && /mx|us|41|419/i.test(v.lang)) ?? voices[0]
      if (pref) u.voice = pref
    }
    pick()
    u.onend = () => onDone?.()
    u.onerror = () => onDone?.()
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(u)
  }, [])

  const startListeningRef = useRef<() => void>(() => {})

  const ejecutar = useCallback(async (ordenDirecta?: string) => {
    const final = (ordenDirecta ?? textoRef.current).trim()
    if (!final || runningRef.current) return
    setRunning(true)
    setResultado('')
    setUltimaOrden(final)
    setTexto('')
    try {
      const r = await api<{ resultado: string }>('/api/instruccion', { method: 'POST', json: { texto: final } })
      setResultado(r.resultado)
      speak(r.resultado, () => { if (voiceModeRef.current) startListeningRef.current() })
    } catch (e) {
      setResultado(`⚠ ERROR DEL SISTEMA: ${String(e)}`)
      speak('Hubo un error del sistema.', () => { if (voiceModeRef.current) startListeningRef.current() })
    } finally {
      setRunning(false)
    }
  }, [speak])

  const startListening = useCallback(() => {
    const SRC = getSR()
    if (!SRC || runningRef.current) return
    try { recRef.current?.abort() } catch { /* ok */ }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()

    const rec = new SRC()
    recRef.current = rec
    rec.lang = 'es-MX'
    rec.interimResults = true
    rec.continuous = false

    let finalText = ''
    rec.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) finalText += r[0].transcript
        else interim += r[0].transcript
      }
      setTexto(finalText || interim)
    }
    rec.onend = () => {
      setListening(false)
      const heard = finalText.trim().replace(/^\s*jarvis[,:]?\s*/i, '')
      if (heard.length > 1) {
        ejecutar(heard)
      } else if (voiceModeRef.current && !runningRef.current) {
        // silencio: en modo voz seguimos escuchando
        setTimeout(() => { if (voiceModeRef.current && !runningRef.current) startListening() }, 400)
      }
    }
    rec.onerror = () => { /* onend maneja el flujo */ }
    rec.start()
    setListening(true)
  }, [ejecutar])

  startListeningRef.current = startListening

  function stopVoice() {
    setVoiceMode(false)
    voiceModeRef.current = false
    try { recRef.current?.abort() } catch { /* ok */ }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    setListening(false)
  }

  function toggleVoiceMode() {
    if (voiceMode) { stopVoice(); return }
    setVoiceMode(true)
    voiceModeRef.current = true
    startListening()
  }

  // Atajo Ctrl+J: hablar una orden
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'j') {
        e.preventDefault()
        if (listening) { try { recRef.current?.stop() } catch { /* ok */ } }
        else startListening()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [listening, startListening])

  return (
    <div className="sticky top-0 z-30 -mx-8 mb-8 border-b border-jarvis-line/60 bg-jarvis-bg/85 px-8 py-3 backdrop-blur-md">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center gap-3">
          <span className="glow-text shrink-0 font-mono text-xs font-bold uppercase tracking-[0.3em] text-jarvis-cyan">Jarvis ▸</span>
          <input
            className="w-full bg-transparent font-mono text-sm text-jarvis-text placeholder-jarvis-dim/50 outline-none"
            placeholder={listening
              ? '● escuchando… habla ahora'
              : 'da una orden o pulsa el micrófono (Ctrl+J)… "¿cómo vamos?" · "registra ventas 4500" · "si el MRR baja de 1000 avísame"'}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && ejecutar()}
            disabled={running}
          />

          {/* Micrófono: una orden por voz */}
          {supported && (
            <button
              onClick={() => (listening ? recRef.current?.stop() : startListening())}
              disabled={running}
              title="Hablar una orden (Ctrl+J)"
              className={`relative flex h-9 w-9 shrink-0 items-center justify-center border transition [clip-path:polygon(6px_0,100%_0,100%_calc(100%-6px),calc(100%-6px)_100%,0_100%,0_6px)] ${
                listening
                  ? 'border-jarvis-cyan bg-jarvis-cyan/20 text-jarvis-glow shadow-[0_0_18px_rgba(34,211,238,0.4)]'
                  : 'border-jarvis-line text-jarvis-dim hover:border-jarvis-cyan/50 hover:text-jarvis-glow'
              }`}
            >
              {listening && <span className="absolute inset-0 animate-ping border border-jarvis-cyan/50" />}
              🎙
            </button>
          )}

          {/* Modo conversación continua */}
          {supported && (
            <button
              onClick={toggleVoiceMode}
              title="Modo voz continua: JARVIS escucha, ejecuta, responde hablando y vuelve a escuchar"
              className={`shrink-0 border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.2em] transition [clip-path:polygon(6px_0,100%_0,100%_calc(100%-6px),calc(100%-6px)_100%,0_100%,0_6px)] ${
                voiceMode
                  ? 'glow-text border-jarvis-cyan bg-jarvis-cyan/20 text-jarvis-glow shadow-[0_0_18px_rgba(34,211,238,0.35)]'
                  : 'border-jarvis-line text-jarvis-dim hover:border-jarvis-cyan/40 hover:text-jarvis-text'
              }`}
            >
              {voiceMode ? '◉ VOZ ACTIVA' : 'MODO VOZ'}
            </button>
          )}

          {/* Silenciar respuestas habladas */}
          <button
            onClick={() => { setSpeakOn(!speakOn); if (speakOn && 'speechSynthesis' in window) window.speechSynthesis.cancel() }}
            title={speakOn ? 'Silenciar respuestas habladas' : 'Activar respuestas habladas'}
            className="shrink-0 font-mono text-sm text-jarvis-dim transition hover:text-jarvis-glow"
          >
            {speakOn ? '🔊' : '🔇'}
          </button>

          <button
            onClick={() => ejecutar()}
            disabled={running || !texto.trim()}
            className="shrink-0 border border-jarvis-cyan/50 bg-jarvis-cyan/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.25em] text-jarvis-glow transition hover:bg-jarvis-cyan/25 disabled:opacity-30 [clip-path:polygon(6px_0,100%_0,100%_calc(100%-6px),calc(100%-6px)_100%,0_100%,0_6px)]"
          >
            Ejecutar
          </button>
        </div>

        {(running || resultado || listening) && (
          <div className="hud-panel mt-3 animate-materialize p-4">
            {listening && !running && !resultado && (
              <div className="glow-text flex items-center gap-2 font-mono text-xs uppercase tracking-[0.25em] text-jarvis-cyan">
                <span className="h-2 w-2 animate-ping rounded-full bg-jarvis-cyan" /> Escuchando{voiceMode ? ' — modo conversación' : ''}… di tu orden
              </div>
            )}
            {(running || resultado) && <div className="hud-label mb-2">◢ ORDEN: {ultimaOrden}</div>}
            {running ? (
              <Spinner label="el sistema está interpretando y ejecutando tu orden…" />
            ) : resultado ? (
              <div>
                <div className="flex items-start justify-between gap-4">
                  <pre className="flex-1 whitespace-pre-wrap font-mono text-sm leading-relaxed text-jarvis-text/90">
                    <Typewriter text={resultado} speed={4} />
                  </pre>
                  <button onClick={() => setResultado('')} className="shrink-0 font-mono text-xs text-jarvis-dim transition hover:text-red-400">✕</button>
                </div>
                <div className="mt-2 border-t border-jarvis-line/40 pt-2">
                  <FeedbackButtons contexto="jarvis" referencia={ultimaOrden.slice(0, 120)} respuesta={resultado} />
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
