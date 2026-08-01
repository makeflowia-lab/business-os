'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { api, fecha } from '@/lib/client'
import { Card, PageTitle, Btn, Textarea, Spinner, Empty, FeedbackButtons } from '@/components/ui'

interface Agent { id: string; nombre: string; emoji: string; rol: string; mensajes: string }
interface Msg { role: string; contenido: string; created_at?: string }

export default function AgentesPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [active, setActive] = useState<Agent | null>(null)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    api<{ agents: Agent[] }>('/api/agents').then((r) => {
      setAgents(r.agents)
      if (r.agents.length > 0) setActive(r.agents[0])
    })
  }, [])

  const loadMessages = useCallback(async (agentId: string) => {
    const r = await api<{ messages: Msg[] }>(`/api/agents/chat?agentId=${agentId}`)
    setMessages(r.messages)
  }, [])

  useEffect(() => { if (active) loadMessages(active.id).catch(console.error) }, [active, loadMessages])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, thinking])

  async function enviar() {
    if (!active || !input.trim() || thinking) return
    const text = input.trim()
    setInput('')
    setMessages((m) => [...m, { role: 'user', contenido: text }])
    setThinking(true)
    try {
      const r = await api<{ respuesta: string }>('/api/agents/chat', { method: 'POST', json: { agentId: active.id, message: text } })
      setMessages((m) => [...m, { role: 'assistant', contenido: r.respuesta }])
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', contenido: `⚠ Error: ${String(e)}` }])
    } finally { setThinking(false) }
  }

  async function limpiar() {
    if (!active) return
    await api(`/api/agents/chat?agentId=${active.id}`, { method: 'DELETE' })
    setMessages([])
  }

  return (
    <div>
      <PageTitle title="Agentes Especializados" subtitle="nueve especialistas. un solo cerebro. todos conocen toda la empresa" />

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="space-y-1.5">
          {agents.map((a, i) => (
            <button
              key={a.id}
              onClick={() => setActive(a)}
              className={`flex w-full animate-materialize items-center gap-3 border px-3 py-2.5 text-left font-mono text-xs uppercase tracking-wider transition [clip-path:polygon(8px_0,100%_0,100%_calc(100%-8px),calc(100%-8px)_100%,0_100%,0_8px)] ${
                active?.id === a.id
                  ? 'glow-text border-jarvis-cyan/60 bg-jarvis-cyan/10 text-jarvis-glow shadow-[0_0_16px_rgba(34,211,238,0.12)]'
                  : 'border-jarvis-line/60 bg-black/20 text-jarvis-dim hover:border-jarvis-cyan/30 hover:text-jarvis-text'
              }`}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <span className="text-base">{a.emoji}</span>
              <span className="flex-1">{a.nombre}</span>
              {active?.id === a.id && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-jarvis-cyan" />}
            </button>
          ))}
        </div>

        <Card className="flex h-[70vh] flex-col lg:col-span-3">
          {active ? (
            <>
              <div className="mb-3 flex items-center gap-3 border-b border-jarvis-line/60 pb-3">
                <span className="text-2xl">{active.emoji}</span>
                <div className="flex-1">
                  <div className="glow-text font-title text-sm font-bold uppercase tracking-widest text-jarvis-text">{active.nombre}</div>
                  <div className="line-clamp-1 font-mono text-[10px] text-jarvis-dim">{active.rol}</div>
                </div>
                <Btn variant="ghost" onClick={limpiar}>Limpiar</Btn>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto pr-2">
                {messages.length === 0 && !thinking && (
                  <Empty>CANAL ABIERTO — pregúntale a {active.nombre}; responde con el contexto completo del núcleo</Empty>
                )}
                {messages.map((m, i) => (
                  <div key={i} className={`max-w-[85%] animate-materialize whitespace-pre-wrap px-4 py-2.5 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'ml-auto border border-jarvis-cyan/30 bg-jarvis-cyan/10 text-jarvis-text [clip-path:polygon(10px_0,100%_0,100%_100%,0_100%,0_10px)]'
                      : 'border border-jarvis-line/60 bg-black/30 text-jarvis-text/85 [clip-path:polygon(0_0,100%_0,100%_calc(100%-10px),calc(100%-10px)_100%,0_100%)]'
                  }`}>
                    {m.contenido}
                    <div className="mt-1 flex items-center justify-between gap-2">
                      {m.created_at ? <span className="font-mono text-[9px] tracking-wider text-jarvis-dim">{fecha(m.created_at)}</span> : <span />}
                      {m.role === 'assistant' && !m.contenido.startsWith('⚠') && (
                        <FeedbackButtons contexto="agente" referencia={active.id} respuesta={m.contenido} />
                      )}
                    </div>
                  </div>
                ))}
                {thinking && <Spinner label={`${active.nombre} está consultando el núcleo…`} />}
                <div ref={bottomRef} />
              </div>

              <div className="mt-3 flex gap-2 border-t border-jarvis-line/60 pt-3">
                <Textarea
                  rows={2}
                  className="flex-1"
                  placeholder={`Mensaje para ${active.nombre}…`}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() } }}
                />
                <Btn disabled={thinking || !input.trim()} onClick={enviar}>Enviar</Btn>
              </div>
            </>
          ) : (
            <div className="pt-10 text-center"><Spinner label="cargando agentes…" /></div>
          )}
        </Card>
      </div>
    </div>
  )
}
