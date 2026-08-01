'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { api, fecha } from '@/lib/client'
import { Card, PageTitle, Btn, Input, Textarea, Select, Empty, Badge, Spinner } from '@/components/ui'

interface Doc { id: string; titulo: string; fuente: string; created_at: string; caracteres: string; chunks: string }
interface Result { titulo: string; contenido: string }

export default function ConocimientoPage() {
  const [docs, setDocs] = useState<Doc[]>([])
  const [titulo, setTitulo] = useState('')
  const [fuente, setFuente] = useState('manual')
  const [contenido, setContenido] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[] | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(() => api<{ documents: Doc[] }>('/api/knowledge').then((r) => setDocs(r.documents)), [])
  useEffect(() => { load().catch(console.error) }, [load])

  async function ingresar() {
    setBusy(true)
    setMsg('')
    try {
      const r = await api<{ chunks: number }>('/api/knowledge', { method: 'POST', json: { titulo, fuente, contenido } })
      setMsg(`Documento absorbido por el núcleo: ${r.chunks} fragmentos indexados.`)
      setTitulo(''); setContenido('')
      await load()
    } catch (e) { setMsg(`Error: ${String(e)}`) } finally { setBusy(false) }
  }

  async function leerArchivo(file: File) {
    const ext = (file.name.split('.').pop() ?? '').toLowerCase()

    // Audio → transcripción STT (Groq)
    if (['mp3', 'wav', 'ogg', 'oga', 'm4a', 'webm'].includes(ext)) {
      setBusy(true)
      setMsg(`🎙️ Escuchando y transcribiendo audio con Groq STT…`)
      try {
        const fd = new FormData()
        fd.append('file', file)
        if (titulo) fd.append('titulo', titulo)
        const res = await fetch('/api/knowledge/audio', { method: 'POST', body: fd })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`)
        setMsg(`✓ Audio transcrito y absorbido: ${data.caracteres.toLocaleString()} caracteres extraídos, ${data.chunks} fragmento(s).`)
        setTitulo('')
        await load()
      } catch (e) { setMsg(`Error: ${String(e)}`) } finally { setBusy(false) }
      return
    }

    // PDF e imágenes → extracción multimodal en el servidor (Claude los lee)
    if (['pdf', 'png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) {
      setBusy(true)
      setMsg(`🔍 Leyendo ${ext === 'pdf' ? 'el PDF' : 'la imagen'} con visión de Claude… (1-3 min)`)
      try {
        const fd = new FormData()
        fd.append('file', file)
        if (titulo) fd.append('titulo', titulo)
        const res = await fetch('/api/knowledge/extract', { method: 'POST', body: fd })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`)
        setMsg(`✓ Absorbido al Brain: ${data.caracteres.toLocaleString()} caracteres extraídos, ${data.chunks} fragmento(s).`)
        setTitulo('')
        await load()
      } catch (e) { setMsg(`Error: ${String(e)}`) } finally { setBusy(false) }
      return
    }

    // Texto plano → flujo normal (pega en el editor)
    const text = await file.text()
    setContenido(text)
    if (!titulo) setTitulo(file.name.replace(/\.[^.]+$/, ''))
    setFuente('archivo')
  }

  async function buscar() {
    if (!query.trim()) { setResults(null); return }
    const r = await api<{ results: Result[] }>(`/api/knowledge/search?q=${encodeURIComponent(query)}`)
    setResults(r.results)
  }

  async function borrar(id: string) {
    await api(`/api/knowledge?id=${id}`, { method: 'DELETE' })
    await load()
  }

  return (
    <div>
      <PageTitle title="Knowledge Engine" subtitle="todo lo que ingresa se convierte en conocimiento del núcleo: texto, notas, contratos, reportes, exportes CSV…" />

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <div className="hud-label mb-3">◢ Ingesta de conocimiento</div>
          <div className="mb-3 flex gap-2">
            <Input className="flex-1" placeholder="Título del documento" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
            <Select value={fuente} onChange={(e) => setFuente(e.target.value)}>
              {['manual', 'archivo', 'email', 'reunion', 'contrato', 'otro'].map((f) => <option key={f} value={f}>{f}</option>)}
            </Select>
          </div>
          <Textarea rows={10} placeholder="Pega aquí el contenido… (o carga un archivo de texto abajo)" value={contenido} onChange={(e) => setContenido(e.target.value)} />
          <div className="mt-3 flex items-center gap-2">
            <Btn disabled={busy || !titulo.trim() || !contenido.trim()} onClick={ingresar}>{busy ? 'Indexando…' : '▲ Absorber al núcleo'}</Btn>
            <input ref={fileRef} type="file" accept=".txt,.md,.csv,.json,.html,.pdf,.png,.jpg,.jpeg,.webp,.gif,.mp3,.wav,.ogg,.oga,.m4a,.webm" className="hidden" onChange={(e) => { if (e.target.files?.[0]) { leerArchivo(e.target.files[0]); e.target.value = '' } }} />
            <Btn variant="ghost" disabled={busy} onClick={() => fileRef.current?.click()}>▤ Archivo / PDF / Audio</Btn>
          </div>
          {busy && <div className="mt-3"><Spinner label="fragmentando e indexando…" /></div>}
          {msg && <p className="glow-text mt-3 font-mono text-xs text-jarvis-cyan">{msg}</p>}
        </Card>

        <Card delay={100} className="lg:col-span-2">
          <div className="hud-label mb-3">◢ Consulta al núcleo</div>
          <div className="flex gap-2">
            <Input placeholder="¿Qué sabe la empresa sobre…?" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && buscar()} />
            <Btn variant="ghost" onClick={buscar}>Buscar</Btn>
          </div>
          {results !== null && (
            <div className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
              {results.length === 0 && <Empty>SIN RESULTADOS</Empty>}
              {results.map((r, i) => (
                <div key={i} className="animate-materialize border border-jarvis-line/60 bg-black/20 p-3" style={{ animationDelay: `${i * 60}ms` }}>
                  <div className="glow-text font-mono text-xs uppercase tracking-wider text-jarvis-glow">{r.titulo}</div>
                  <div className="mt-1.5 whitespace-pre-wrap font-mono text-xs leading-relaxed text-jarvis-text/70">{r.contenido.slice(0, 400)}{r.contenido.length > 400 ? '…' : ''}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card delay={180} className="mt-6">
        <div className="hud-label mb-3">◢ Archivo del núcleo // {docs.length} documento(s)</div>
        {docs.length === 0 && <Empty>NÚCLEO VACÍO — aliméntalo: cada documento lo hace más inteligente</Empty>}
        <div className="space-y-2">
          {docs.map((d, i) => (
            <div key={d.id} className="flex animate-materialize items-center gap-3 border border-jarvis-line/60 bg-black/20 px-4 py-2.5 [clip-path:polygon(10px_0,100%_0,100%_calc(100%-10px),calc(100%-10px)_100%,0_100%,0_10px)]" style={{ animationDelay: `${i * 40}ms` }}>
              <div className="min-w-0 flex-1">
                <div className="truncate font-title text-sm font-semibold text-jarvis-text">{d.titulo}</div>
                <div className="font-mono text-[10px] tracking-wider text-jarvis-dim">{Number(d.caracteres).toLocaleString()} CHARS · {d.chunks} FRAG · {fecha(d.created_at)}</div>
              </div>
              <Badge>{d.fuente}</Badge>
              <Btn variant="danger" onClick={() => borrar(d.id)}>✕</Btn>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
