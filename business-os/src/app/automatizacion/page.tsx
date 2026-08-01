'use client'

import { useCallback, useEffect, useState } from 'react'
import { api, fecha } from '@/lib/client'
import { Card, PageTitle, Btn, Input, Select, Badge, Empty } from '@/components/ui'

interface Schedule {
  id: string; nombre: string; cron: string; instruccion: string
  activo: boolean; last_run: string | null; last_result: string | null; next_run: string | null
}

interface Rule {
  id: string; nombre: string; kpi_nombre: string; condicion: string; umbral: string
  instruccion: string | null; activo: boolean; ultimo_valor: string | null; last_triggered: string | null
}

export default function AutomatizacionPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [google, setGoogle] = useState(false)
  const [form, setForm] = useState({ nombre: '', cron: '0 8 * * *', instruccion: '' })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [abierto, setAbierto] = useState<string | null>(null)
  const [rules, setRules] = useState<Rule[]>([])
  const [ruleForm, setRuleForm] = useState({ kpiNombre: '', condicion: 'menor', umbral: '', instruccion: '' })
  const [ruleMsg, setRuleMsg] = useState('')

  const [whatsapp, setWhatsapp] = useState(false)

  const load = useCallback(() =>
    Promise.all([
      api<{ schedules: Schedule[]; google: boolean; whatsapp: boolean }>('/api/schedules').then((r) => { setSchedules(r.schedules); setGoogle(r.google); setWhatsapp(r.whatsapp) }),
      api<{ rules: Rule[] }>('/api/rules').then((r) => setRules(r.rules)),
    ]), [])
  useEffect(() => { load().catch(console.error) }, [load])

  async function crearRegla() {
    setRuleMsg('')
    try {
      await api('/api/rules', { method: 'POST', json: { ...ruleForm, umbral: Number(ruleForm.umbral) } })
      setRuleForm({ kpiNombre: '', condicion: 'menor', umbral: '', instruccion: '' })
      setRuleMsg('Regla activa. El Centinela vigila cada 30 s y avisa por Telegram.')
      await load()
    } catch (e) { setRuleMsg(String(e)) }
  }

  async function toggleRegla(r: Rule) {
    await api('/api/rules', { method: 'PATCH', json: { id: r.id, activo: !r.activo } })
    await load()
  }

  async function borrarRegla(id: string) {
    await api(`/api/rules?id=${id}`, { method: 'DELETE' })
    await load()
  }

  async function crear() {
    setBusy(true); setMsg('')
    try {
      await api('/api/schedules', { method: 'POST', json: form })
      setForm({ nombre: '', cron: '0 8 * * *', instruccion: '' })
      setMsg('Cron job creado. El sistema lo ejecutará y te avisará por Telegram.')
      await load()
    } catch (e) { setMsg(String(e)) } finally { setBusy(false) }
  }

  async function toggle(s: Schedule) {
    await api('/api/schedules', { method: 'PATCH', json: { id: s.id, activo: !s.activo } })
    await load()
  }

  async function borrar(id: string) {
    await api(`/api/schedules?id=${id}`, { method: 'DELETE' })
    await load()
  }

  return (
    <div>
      <PageTitle title="Automatización" subtitle="el gerente da instrucciones, el Business OS ejecuta — usa la barra JARVIS de arriba para órdenes directas" />

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="hud-label mb-3">◢ Enlaces del sistema // Integraciones</div>
          <div className="space-y-2 font-mono text-sm">
            {[
              { label: '◈ WHATSAPP BUSINESS', ok: whatsapp, txt: whatsapp ? 'ENLAZADO' : 'SIN CREDENCIALES' },
              { label: '✉ GMAIL + ▤ DRIVE', ok: google, txt: google ? 'ENLAZADO' : 'SIN ENLACE' },
              { label: '◈ TELEGRAM', ok: true, txt: 'ACTIVO' },
              { label: '⏱ CRON JOBS', ok: true, txt: `${schedules.filter((s) => s.activo).length} ACTIVOS` },
            ].map((r) => (
              <div key={r.label} className="flex items-center justify-between border border-jarvis-line/60 bg-black/20 px-3 py-2.5 [clip-path:polygon(8px_0,100%_0,100%_calc(100%-8px),calc(100%-8px)_100%,0_100%,0_8px)]">
                <span className="text-jarvis-text/80">{r.label}</span>
                <span className={`flex items-center gap-2 text-[10px] tracking-[0.25em] ${r.ok ? 'glow-text text-jarvis-glow' : 'glow-amber text-jarvis-amber'}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${r.ok ? 'animate-pulse bg-jarvis-cyan' : 'bg-jarvis-amber'}`} />
                  {r.txt}
                </span>
              </div>
            ))}
          </div>
          {!google && (
            <p className="mt-3 font-mono text-[11px] leading-relaxed text-jarvis-dim">
              Para enlazar Google: sigue <span className="text-jarvis-cyan">INTEGRACIONES.md</span> y corre <span className="text-jarvis-glow">npm run google:auth</span>
            </p>
          )}
        </Card>

        <Card delay={100}>
          <div className="hud-label mb-3">◢ Programar cron job</div>
          <div className="space-y-2">
            <Input placeholder="Nombre (ej. Resumen diario)" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            <Input placeholder="Cron (ej. 0 8 * * * = diario 8am)" value={form.cron} onChange={(e) => setForm({ ...form, cron: e.target.value })} />
            <Input placeholder='Instrucción (ej. "sincroniza gmail y mándame el resumen")' value={form.instruccion} onChange={(e) => setForm({ ...form, instruccion: e.target.value })} />
            <Btn disabled={busy || !form.nombre.trim() || !form.instruccion.trim()} onClick={crear}>⏱ Programar</Btn>
            {msg && <p className="glow-text font-mono text-xs text-jarvis-cyan">{msg}</p>}
            <p className="font-mono text-[11px] text-jarvis-dim">también puedes programar hablando: díselo a JARVIS arriba o al bot de Telegram</p>
          </div>
        </Card>
      </div>

      {/* ── Centinela: vigilancia de KPIs ─────────────────────────── */}
      <Card className="mb-6">
        <div className="hud-label mb-3">◢ Centinela // vigilancia de KPIs por umbral</div>
        <div className="flex flex-wrap gap-2">
          <Input className="w-36 flex-1" placeholder="KPI (ej. MRR)" value={ruleForm.kpiNombre} onChange={(e) => setRuleForm({ ...ruleForm, kpiNombre: e.target.value })} />
          <Select value={ruleForm.condicion} onChange={(e) => setRuleForm({ ...ruleForm, condicion: e.target.value })}>
            <option value="menor">cae debajo de</option>
            <option value="mayor">supera</option>
          </Select>
          <Input className="w-28" placeholder="umbral" value={ruleForm.umbral} onChange={(e) => setRuleForm({ ...ruleForm, umbral: e.target.value })} />
          <Input className="w-64 flex-[2]" placeholder="al dispararse… (opcional, ej. 'genera un reporte de caja')" value={ruleForm.instruccion} onChange={(e) => setRuleForm({ ...ruleForm, instruccion: e.target.value })} />
          <Btn disabled={!ruleForm.kpiNombre.trim() || !ruleForm.umbral.trim()} onClick={crearRegla}>🛡 Vigilar</Btn>
        </div>
        {ruleMsg && <p className="glow-text mt-2 font-mono text-xs text-jarvis-cyan">{ruleMsg}</p>}
        {rules.length > 0 && (
          <div className="mt-4 space-y-2">
            {rules.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-2.5 border border-jarvis-line/60 bg-black/20 px-3 py-2 [clip-path:polygon(8px_0,100%_0,100%_calc(100%-8px),calc(100%-8px)_100%,0_100%,0_8px)]">
                <span className={r.activo ? 'glow-text text-jarvis-cyan' : 'text-jarvis-dim'}>🛡</span>
                <span className="font-mono text-xs text-jarvis-text">{r.kpi_nombre} {r.condicion === 'menor' ? '<' : '>'} {r.umbral}</span>
                <Badge tone={r.activo ? 'ejecutada' : undefined}>{r.activo ? 'vigilando' : 'pausada'}</Badge>
                <span className="font-mono text-[10px] text-jarvis-dim">actual: {r.ultimo_valor ?? 'sin dato'}</span>
                {r.instruccion && <span className="font-mono text-[10px] text-jarvis-dim">→ {r.instruccion}</span>}
                <span className="ml-auto flex gap-2">
                  <button className="font-mono text-[10px] uppercase text-jarvis-dim hover:text-jarvis-glow" onClick={() => toggleRegla(r)}>{r.activo ? 'pausar' : 'activar'}</button>
                  <button className="font-mono text-[10px] text-jarvis-dim hover:text-red-400" onClick={() => borrarRegla(r.id)}>✕</button>
                </span>
              </div>
            ))}
          </div>
        )}
        <p className="mt-3 font-mono text-[11px] text-jarvis-dim">también por voz: &quot;si el MRR baja de 1000 avísame y genera un análisis de caja&quot;</p>
      </Card>

      <div className="hud-label mb-3">◢ Cron jobs // {schedules.length}</div>
      {schedules.length === 0 && <Empty>SIN AUTOMATIZACIONES — ejemplo: &quot;todos los días a las 8am sincroniza gmail y mándame el resumen&quot;</Empty>}
      <div className="space-y-3">
        {schedules.map((s, i) => (
          <Card key={s.id} delay={i * 60}>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className={`h-2 w-2 rounded-full ${s.activo ? 'animate-pulse bg-jarvis-cyan shadow-[0_0_8px_#22d3ee]' : 'bg-jarvis-dim'}`} />
              <span className="font-title text-sm font-semibold uppercase tracking-wider text-jarvis-text">{s.nombre}</span>
              <Badge>{s.cron}</Badge>
              <span className="ml-auto font-mono text-[10px] text-jarvis-dim">
                {s.next_run ? `PRÓXIMA: ${fecha(s.next_run)}` : ''}
              </span>
            </div>
            <p className="mt-1.5 font-mono text-xs text-jarvis-text/70">{s.instruccion}</p>
            <div className="mt-3 flex items-center gap-2">
              <Btn variant="ghost" onClick={() => toggle(s)}>{s.activo ? '❚❚ Pausar' : '▶ Reanudar'}</Btn>
              {s.last_result && (
                <Btn variant="ghost" onClick={() => setAbierto(abierto === s.id ? null : s.id)}>
                  {abierto === s.id ? 'Ocultar' : `Última ejecución${s.last_run ? ` (${fecha(s.last_run)})` : ''}`}
                </Btn>
              )}
              <Btn variant="danger" onClick={() => borrar(s.id)}>✕</Btn>
            </div>
            {abierto === s.id && s.last_result && (
              <div className="mt-3 animate-materialize border border-jarvis-line/60 bg-black/40 p-4">
                <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-jarvis-text/85">{s.last_result}</pre>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
