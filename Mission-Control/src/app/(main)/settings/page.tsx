'use client'
import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { updateProfile, updateAvatar } from '@/actions/auth'
import {
  Tag,
  Plus,
  Trash2,
  Webhook,
  CheckCircle,
  XCircle,
  Save,
  Palette,
  Users,
  Zap,
  AlertTriangle,
  Bell,
  BellOff,
  Smartphone,
  Camera,
  Mail,
  Shield,
  CalendarDays,
  Loader2,
  UserCircle,
} from 'lucide-react'
import type { Label, Agent } from '@/types/database'
import { usePushSubscription } from '@/features/notifications/hooks/usePushSubscription'

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280', '#14b8a6',
]

function SettingsContent() {
  const { isOwner, profile } = useAuth()
  const searchParams = useSearchParams()
  const labelsRef = useRef<HTMLElement>(null)
  const apiRef = useRef<HTMLElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const { status: pushStatus, loading: pushLoading, subscribe, unsubscribe } = usePushSubscription()
  const [labels, setLabels] = useState<Label[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [newLabelName, setNewLabelName] = useState('')
  const [newLabelColor, setNewLabelColor] = useState(PRESET_COLORS[0])

  // Profile state
  const [profileName, setProfileName] = useState('')
  const [profileNameLoaded, setProfileNameLoaded] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  if (profile && !profileNameLoaded) {
    setProfileName(profile.full_name ?? '')
    setProfileNameLoaded(true)
  }

  const avatarSrc = avatarPreview ?? profile?.avatar_url
  const initials = (profile?.full_name ?? profile?.email ?? '?')
    .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarPreview(URL.createObjectURL(file))
    setAvatarUploading(true)
    setProfileMsg(null)
    const fd = new FormData()
    fd.append('avatar', file)
    const result = await updateAvatar(fd)
    setAvatarUploading(false)
    if (result.error) {
      setProfileMsg({ type: 'error', text: result.error })
      setAvatarPreview(null)
    } else {
      setProfileMsg({ type: 'success', text: 'Avatar updated' })
      if (result.avatar_url) setAvatarPreview(result.avatar_url)
    }
  }

  const handleSaveProfileName = async () => {
    setProfileSaving(true)
    setProfileMsg(null)
    const fd = new FormData()
    fd.append('full_name', profileName)
    const result = await updateProfile(fd)
    setProfileSaving(false)
    if (result.error) {
      setProfileMsg({ type: 'error', text: result.error })
    } else {
      setProfileMsg({ type: 'success', text: 'Name updated' })
    }
  }
  const [editingLabel, setEditingLabel] = useState<string | null>(null)
  const [editLabelName, setEditLabelName] = useState('')
  const [editLabelColor, setEditLabelColor] = useState('')
  const [webhookStatus, setWebhookStatus] = useState<'checking' | 'connected' | 'error'>('checking')
  const [webhookLastEvent, setWebhookLastEvent] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    const supabase = createClient()
    const [labelsRes, agentsRes, activityRes] = await Promise.all([
      supabase.from('labels').select('*').order('name'),
      supabase.from('agents').select('*').order('name'),
      supabase
        .from('activities')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1),
    ])

    if (labelsRes.data) setLabels(labelsRes.data as Label[])
    if (agentsRes.data) setAgents(agentsRes.data as Agent[])

    if (activityRes.data && activityRes.data.length > 0) {
      const lastActivity = activityRes.data[0]
      if (lastActivity.created_at) {
        const lastTime = new Date(lastActivity.created_at)
        const minutesAgo = Math.floor((Date.now() - lastTime.getTime()) / 60000)
        if (minutesAgo < 60) {
          setWebhookStatus('connected')
          setWebhookLastEvent(`${minutesAgo}m ago`)
        } else {
          const hoursAgo = Math.floor(minutesAgo / 60)
          if (hoursAgo < 24) {
            setWebhookStatus('connected')
            setWebhookLastEvent(`${hoursAgo}h ago`)
          } else {
            setWebhookStatus('error')
            setWebhookLastEvent(`${Math.floor(hoursAgo / 24)}d ago`)
          }
        }
      }
    } else {
      setWebhookStatus('error')
      setWebhookLastEvent('No events received')
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    const section = searchParams.get('section')
    if (section === 'labels') labelsRef.current?.scrollIntoView({ behavior: 'smooth' })
    if (section === 'api') apiRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [searchParams, isOwner])

  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) return
    setSaving(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('labels')
      .insert({ name: newLabelName.trim(), color: newLabelColor })
      .select('*')
      .single()
    if (data) {
      setLabels((prev) => [...prev, data as Label])
    }
    setNewLabelName('')
    setNewLabelColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)])
    setSaving(false)
  }

  const handleUpdateLabel = async (id: string) => {
    if (!editLabelName.trim()) return
    setSaving(true)
    const supabase = createClient()
    await supabase
      .from('labels')
      .update({ name: editLabelName.trim(), color: editLabelColor })
      .eq('id', id)
    setLabels((prev) =>
      prev.map((l) => l.id === id ? { ...l, name: editLabelName.trim(), color: editLabelColor } : l)
    )
    setEditingLabel(null)
    setSaving(false)
  }

  const handleDeleteLabel = async (id: string) => {
    const supabase = createClient()
    await supabase.from('labels').delete().eq('id', id)
    setLabels((prev) => prev.filter((l) => l.id !== id))
  }

  const startEditLabel = (label: Label) => {
    setEditingLabel(label.id)
    setEditLabelName(label.name)
    setEditLabelColor(label.color)
  }

  return (
    <div className="h-full overflow-y-auto">
    <div className="max-w-3xl mx-auto p-6 space-y-8 pb-24">
      <div>
        <h1 className="text-xl font-bold text-white">Settings</h1>
        <p className="text-sm text-white/40 mt-1">Manage labels, monitor webhooks, and view agent configuration.</p>
      </div>

      {/* Webhook Status */}
      <section className="bg-white/[0.04] border border-white/[0.08] rounded-xl overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Webhook size={16} className="text-white/50" />
            <h2 className="text-sm font-semibold text-white/80">Webhook Status</h2>
          </div>
          <p className="text-xs text-white/30 mt-1">Agent event pipeline</p>
        </div>
        <div className="p-5">
          <div className="flex items-center gap-3">
            {webhookStatus === 'checking' && (
              <div className="w-3 h-3 rounded-full bg-yellow-400/50 animate-pulse" />
            )}
            {webhookStatus === 'connected' && (
              <CheckCircle size={16} className="text-emerald-400" />
            )}
            {webhookStatus === 'error' && (
              <XCircle size={16} className="text-red-400" />
            )}
            <div>
              <p className="text-sm text-white/70">
                {webhookStatus === 'checking' && 'Checking connection...'}
                {webhookStatus === 'connected' && 'Connected — Events flowing'}
                {webhookStatus === 'error' && 'No recent events detected'}
              </p>
              {webhookLastEvent && (
                <p className="text-xs text-white/30 mt-0.5">
                  Last event: {webhookLastEvent}
                </p>
              )}
            </div>
          </div>
          <div className="mt-4 bg-white/[0.03] border border-white/[0.06] rounded-lg p-3">
            <p className="text-[10px] uppercase tracking-widest text-white/25 mb-2">Endpoint</p>
            <code className="text-xs text-white/50 font-mono break-all">
              /api/openclaw/event
            </code>
            <p className="text-[10px] uppercase tracking-widest text-white/25 mt-3 mb-1">Events Handled</p>
            <div className="flex flex-wrap gap-1.5">
              {['lifecycle:start', 'lifecycle:end', 'lifecycle:error', 'tool:start', 'document'].map((evt) => (
                <span key={evt} className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-white/40 border border-white/[0.08]">
                  {evt}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Labels Management — Owner only */}
      {isOwner && (
      <section ref={labelsRef} className="bg-white/[0.04] border border-white/[0.08] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag size={16} className="text-white/50" />
              <h2 className="text-sm font-semibold text-white/80">Labels</h2>
              <span className="text-[10px] bg-white/[0.06] px-1.5 py-0.5 rounded-full text-white/30">
                {labels.length}
              </span>
            </div>
          </div>
          <p className="text-xs text-white/30 mt-1">Organize tasks with color-coded labels</p>
        </div>
        <div className="p-5 space-y-3">
          {/* Create new label */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setNewLabelColor(color)}
                  className={`w-5 h-5 rounded-full transition-transform ${
                    newLabelColor === color ? 'ring-2 ring-white/30 ring-offset-1 ring-offset-[#0a0a0f] scale-110' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <input
              type="text"
              value={newLabelName}
              onChange={(e) => setNewLabelName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateLabel() }}
              placeholder="New label name..."
              className="flex-1 bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm text-white/80 placeholder:text-white/20 outline-none focus:border-white/[0.15]"
            />
            <button
              onClick={handleCreateLabel}
              disabled={!newLabelName.trim() || saving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.08] text-white/60 border border-white/[0.1] hover:bg-white/[0.12] transition-colors disabled:opacity-30"
            >
              <Plus size={12} />
              Add
            </button>
          </div>

          {/* Existing labels */}
          <div className="space-y-1">
            {labels.map((label) => (
              <div
                key={label.id}
                className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.06] group hover:bg-white/[0.04] transition-colors"
              >
                {editingLabel === label.id ? (
                  <>
                    <div className="flex items-center gap-1">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color}
                          onClick={() => setEditLabelColor(color)}
                          className={`w-4 h-4 rounded-full transition-transform ${
                            editLabelColor === color ? 'ring-2 ring-white/30 scale-110' : ''
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <input
                      type="text"
                      value={editLabelName}
                      onChange={(e) => setEditLabelName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleUpdateLabel(label.id)
                        if (e.key === 'Escape') setEditingLabel(null)
                      }}
                      autoFocus
                      className="flex-1 bg-white/[0.06] border border-white/[0.1] rounded px-2 py-0.5 text-sm text-white outline-none"
                    />
                    <button
                      onClick={() => handleUpdateLabel(label.id)}
                      className="p-1 text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      <Save size={14} />
                    </button>
                    <button
                      onClick={() => setEditingLabel(null)}
                      className="p-1 text-white/30 hover:text-white/60 transition-colors"
                    >
                      <XCircle size={14} />
                    </button>
                  </>
                ) : (
                  <>
                    <span
                      className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: label.color }}
                    />
                    <span className="flex-1 text-sm text-white/70">{label.name}</span>
                    <button
                      onClick={() => startEditLabel(label)}
                      className="p-1 text-white/20 hover:text-white/50 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Palette size={12} />
                    </button>
                    <button
                      onClick={() => handleDeleteLabel(label.id)}
                      className="p-1 text-white/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={12} />
                    </button>
                  </>
                )}
              </div>
            ))}
            {labels.length === 0 && (
              <p className="text-xs text-white/20 text-center py-4">No labels created yet</p>
            )}
          </div>
        </div>
      </section>
      )}

      {/* Agent Configuration Overview */}
      <section className="bg-white/[0.04] border border-white/[0.08] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-white/50" />
            <h2 className="text-sm font-semibold text-white/80">Agent Configuration</h2>
          </div>
          <p className="text-xs text-white/30 mt-1">Overview of registered agents and their personalities</p>
        </div>
        <div className="p-5 space-y-3">
          {agents.map((agent) => (
            <div key={agent.id} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
              <div className="flex items-start gap-3">
                <span className="text-3xl">{agent.avatar}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-white">{agent.name}</h3>
                    <span className={`text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded border ${
                      agent.level === 'LEAD' ? 'text-purple-300 bg-purple-400/10 border-purple-400/20' :
                      agent.level === 'INT' ? 'text-blue-300 bg-blue-400/10 border-blue-400/20' :
                      'text-white/50 bg-white/[0.06] border-white/[0.1]'
                    }`}>{agent.level}</span>
                    <span className={`flex items-center gap-1 text-[10px] ${
                      agent.status === 'active' ? 'text-emerald-400' :
                      agent.status === 'blocked' ? 'text-red-400' :
                      'text-white/30'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        agent.status === 'active' ? 'bg-emerald-400' :
                        agent.status === 'blocked' ? 'bg-red-400' :
                        'bg-white/30'
                      }`} />
                      {agent.status}
                    </span>
                  </div>
                  <p className="text-xs text-white/40 mb-2">{agent.role}</p>

                  {/* Personality fields */}
                  <div className="space-y-2">
                    {agent.system_prompt && (
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-white/25 mb-0.5">System Prompt</p>
                        <p className="text-xs text-white/50 line-clamp-2">{agent.system_prompt}</p>
                      </div>
                    )}
                    {agent.character && (
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-white/25 mb-0.5">Character</p>
                        <p className="text-xs text-white/50 line-clamp-2">{agent.character}</p>
                      </div>
                    )}
                    {agent.lore && (
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-white/25 mb-0.5">Lore</p>
                        <p className="text-xs text-white/50 line-clamp-2">{agent.lore}</p>
                      </div>
                    )}
                    {!agent.system_prompt && !agent.character && !agent.lore && (
                      <div className="flex items-center gap-1.5 text-xs text-yellow-400/60">
                        <AlertTriangle size={12} />
                        <span>No personality configured — edit agent to add system prompt, character, and lore</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {agents.length === 0 && (
            <p className="text-xs text-white/20 text-center py-4">No agents registered</p>
          )}
        </div>
      </section>

      {/* Push Notifications */}
      <section className="bg-white/[0.04] border border-white/[0.08] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Smartphone size={16} className="text-white/50" />
            <h2 className="text-sm font-semibold text-white/80">Push Notifications</h2>
          </div>
          <p className="text-xs text-white/30 mt-1">Receive alerts even when Mission Control is closed</p>
        </div>
        <div className="p-5">
          {pushStatus === 'unsupported' && (
            <div className="flex items-center gap-2 text-xs text-white/30">
              <BellOff size={14} />
              <span>Push notifications not supported in this browser</span>
            </div>
          )}

          {pushStatus === 'denied' && (
            <div className="flex items-center gap-2 text-xs text-yellow-400/70">
              <AlertTriangle size={14} />
              <span>Notifications blocked — enable them in your browser settings</span>
            </div>
          )}

          {(pushStatus === 'subscribed' || pushStatus === 'unsubscribed') && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  pushStatus === 'subscribed' ? 'bg-violet-500/20 text-violet-400' : 'bg-white/[0.06] text-white/30'
                }`}>
                  {pushStatus === 'subscribed' ? <Bell size={16} /> : <BellOff size={16} />}
                </div>
                <div>
                  <p className="text-sm text-white/70">
                    {pushStatus === 'subscribed' ? 'Push notifications active' : 'Push notifications off'}
                  </p>
                  <p className="text-xs text-white/30 mt-0.5">
                    {pushStatus === 'subscribed'
                      ? 'You will receive alerts for agent activity'
                      : 'Enable to get alerts when agents are active'}
                  </p>
                </div>
              </div>
              <button
                onClick={pushStatus === 'subscribed' ? unsubscribe : subscribe}
                disabled={pushLoading}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-40
                  ${pushStatus === 'subscribed'
                    ? 'bg-white/[0.06] text-white/50 border border-white/[0.1] hover:bg-red-400/[0.08] hover:text-red-400/70 hover:border-red-400/20'
                    : 'bg-violet-500/90 hover:bg-violet-500 text-white'
                  }`}
              >
                {pushLoading ? (
                  <span className="w-3 h-3 border border-current/30 border-t-current rounded-full animate-spin" />
                ) : pushStatus === 'subscribed' ? (
                  <BellOff size={12} />
                ) : (
                  <Bell size={12} />
                )}
                {pushStatus === 'subscribed' ? 'Disable' : 'Enable'}
              </button>
            </div>
          )}

          {pushStatus === 'loading' && (
            <div className="flex items-center gap-2 text-xs text-white/30">
              <span className="w-3 h-3 border border-white/20 border-t-white/50 rounded-full animate-spin" />
              <span>Checking notification status...</span>
            </div>
          )}
        </div>
      </section>

      {/* Agent Action API — Owner only */}
      {isOwner && (
      <section ref={apiRef} className="bg-white/[0.04] border border-white/[0.08] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-white/50" />
            <h2 className="text-sm font-semibold text-white/80">Agent Action API</h2>
          </div>
          <p className="text-xs text-white/30 mt-1">Endpoints available for agent operations</p>
        </div>
        <div className="p-5 space-y-3">
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3">
            <p className="text-[10px] uppercase tracking-widest text-white/25 mb-2">Actions Available</p>
            <div className="space-y-1.5">
              {[
                { action: 'create_task', desc: 'Create a new task with optional assignment' },
                { action: 'update_task', desc: 'Update task status, title, or description' },
                { action: 'query_tasks', desc: 'Query tasks by status with pagination' },
                { action: 'log_activity', desc: 'Log an activity entry for an agent' },
                { action: 'update_agent', desc: 'Update agent status (idle/active/blocked)' },
                { action: 'query_agents', desc: 'List all registered agents' },
              ].map((item) => (
                <div key={item.action} className="flex items-start gap-2">
                  <code className="text-[10px] text-purple-300/80 bg-purple-500/10 px-1.5 py-0.5 rounded font-mono flex-shrink-0">
                    {item.action}
                  </code>
                  <span className="text-[11px] text-white/40">{item.desc}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3">
            <p className="text-[10px] uppercase tracking-widest text-white/25 mb-1">Authentication</p>
            <p className="text-xs text-white/40">
              Bearer token via <code className="text-[10px] bg-white/[0.06] px-1 py-0.5 rounded">OPENCLAW_GATEWAY_TOKEN</code>
            </p>
          </div>
        </div>
      </section>
      )}
    </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsContent />
    </Suspense>
  )
}
