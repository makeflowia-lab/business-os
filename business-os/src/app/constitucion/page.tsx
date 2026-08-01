'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/client'
import { Card, PageTitle, Btn, Input, Textarea, Spinner } from '@/components/ui'

export default function ConstitucionPage() {
  const [empresa, setEmpresa] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [contenido, setContenido] = useState('')
  const [version, setVersion] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    api<{ constitution: { empresa: string; contenido: string; version: number } | null }>('/api/constitution')
      .then((r) => {
        if (r.constitution) {
          setEmpresa(r.constitution.empresa)
          setContenido(r.constitution.contenido)
          setVersion(r.constitution.version)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  async function generar() {
    if (!empresa.trim()) { setMsg('Escribe el nombre de la empresa primero.'); return }
    setGenerating(true)
    setMsg('')
    try {
      const r = await api<{ contenido: string }>('/api/constitution/generate', { method: 'POST', json: { empresa, descripcion } })
      setContenido(r.contenido)
      setMsg('Borrador generado. Revísalo, edítalo y guárdalo — es tu documento fundacional.')
    } catch (e) {
      setMsg(`Error: ${String(e)}`)
    } finally { setGenerating(false) }
  }

  async function guardar() {
    setSaving(true)
    setMsg('')
    try {
      const r = await api<{ version: number }>('/api/constitution', { method: 'PUT', json: { empresa, contenido } })
      setVersion(r.version)
      setMsg(`Constitución v${r.version} activa. El núcleo ya piensa con ella.`)
    } catch (e) {
      setMsg(`Error: ${String(e)}`)
    } finally { setSaving(false) }
  }

  if (loading) return <div className="pt-16 text-center"><Spinner label="cargando documento fundacional…" /></div>

  return (
    <div>
      <PageTitle
        title="Constitución Empresarial"
        subtitle={version ? `versión ${version} activa // cada cambio crea una nueva versión` : 'el documento fundacional que define cómo piensa tu Business OS'}
      />

      <Card className="mb-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="hud-label mb-1.5 block">Empresa</label>
            <Input placeholder="Nombre de la empresa" value={empresa} onChange={(e) => setEmpresa(e.target.value)} />
          </div>
          <div>
            <label className="hud-label mb-1.5 block">Descripción breve (para generar el borrador)</label>
            <Input placeholder="Qué hace, a quién sirve, tamaño…" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Btn variant="ghost" onClick={generar} disabled={generating || !empresa.trim()}>
            {generating ? 'Generando…' : '✦ Generar borrador con IA'}
          </Btn>
          <Btn onClick={guardar} disabled={saving || !empresa.trim() || !contenido.trim()}>
            {saving ? 'Guardando…' : version ? 'Guardar nueva versión' : 'Fundar el Business OS'}
          </Btn>
        </div>
        {generating && <div className="mt-3"><Spinner label="el arquitecto está redactando tu constitución…" /></div>}
        {msg && <p className="glow-text mt-3 font-mono text-xs text-jarvis-cyan">{msg}</p>}
      </Card>

      <Card delay={120}>
        <label className="hud-label mb-2 block">Contenido (markdown) — identidad · misión · principios · límites · tono · prioridades</label>
        <Textarea
          rows={24}
          className="text-xs leading-relaxed"
          placeholder="## Identidad&#10;…&#10;&#10;## Misión del Business OS&#10;Ser la memoria, el analista, el coordinador y el copiloto estratégico de la empresa.&#10;…"
          value={contenido}
          onChange={(e) => setContenido(e.target.value)}
        />
      </Card>
    </div>
  )
}
