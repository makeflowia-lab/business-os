'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AgentCard } from '@/features/agents/components/AgentCard'
import { AgentManageModal } from '@/features/agents/components/AgentManageModal'
import { useFiltersStore } from '@/shared/stores/filters-store'
import { useAuth } from '@/hooks/useAuth'
import {
  LayoutGrid,
  Activity,
  Clock,
  Calendar,
  Settings,
  Inbox,
  Zap,
  Users,
  Plus,
  Bookmark,
  X,
  ChevronDown,
  ChevronRight,
  PenLine,
  Bot,
  LogOut,
  UserCircle,
} from 'lucide-react'
import { canAccessRoute } from '@/lib/permissions'
import { signout } from '@/actions/auth'
import type { Agent, TaskStatus, TaskPriority } from '@/types/database'

interface SavedView {
  id: string
  name: string
  filters: Record<string, unknown>
}

const NAV_LINKS = [
  { href: '/', label: 'Board', icon: LayoutGrid },
  { href: '/chat', label: 'Chat', icon: Bot },
  { href: '/activity', label: 'Activity', icon: Activity },
  { href: '/cron', label: 'Cron', icon: Clock },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/draw', label: 'Draw', icon: PenLine },
  { href: '/settings', label: 'Settings', icon: Settings },
] as const

interface SidebarNavProps {
  agents: Agent[]
  loading: boolean
  selectedAgentId?: string
  onSelectAgent?: (id: string | undefined) => void
  onAgentChange?: () => void
}

export function SidebarNav({ agents, loading, selectedAgentId, onSelectAgent, onAgentChange }: SidebarNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { setFilter, resetFilters } = useFiltersStore()
  const { isOwner, role } = useAuth()
  const activeCount = agents.filter(a => a.status === 'active').length

  const [modalOpen, setModalOpen] = useState(false)
  const [editAgent, setEditAgent] = useState<Agent | null>(null)
  const [savedViews, setSavedViews] = useState<SavedView[]>([])
  const [viewsExpanded, setViewsExpanded] = useState(false)
  const [agentsExpanded, setAgentsExpanded] = useState(true)
  const [taskCounts, setTaskCounts] = useState({ inbox: 0, active: 0 })

  const fetchSidebarData = useCallback(async () => {
    const supabase = createClient()
    const [viewsRes, inboxRes, activeRes] = await Promise.all([
      supabase.from('saved_views').select('id, name, filters').order('name'),
      supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('status', 'inbox' as TaskStatus),
      supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('status', 'in_progress' as TaskStatus),
    ])
    if (viewsRes.data) setSavedViews(viewsRes.data as unknown as SavedView[])
    setTaskCounts({
      inbox: inboxRes.count ?? 0,
      active: activeRes.count ?? 0,
    })
  }, [])

  useEffect(() => {
    fetchSidebarData()
  }, [fetchSidebarData])

  const handleCreate = () => {
    setEditAgent(null)
    setModalOpen(true)
  }

  const handleEdit = (agent: Agent) => {
    setEditAgent(agent)
    setModalOpen(true)
  }

  const handleQuickView = (type: 'inbox' | 'active') => {
    resetFilters()
    if (type === 'inbox') {
      setFilter('status', 'inbox')
    } else if (type === 'active') {
      setFilter('status', 'in_progress')
    }
    if (pathname !== '/') {
      router.push('/')
    }
  }

  const handleAgentClick = (agentId: string) => {
    // If already filtering by this agent, clear the filter
    const currentAssignee = useFiltersStore.getState().filters.assigneeId
    if (currentAssignee === agentId) {
      setFilter('assigneeId', null)
    } else {
      setFilter('assigneeId', agentId)
    }
    onSelectAgent?.(currentAssignee === agentId ? undefined : agentId)
  }

  const handleLoadView = (view: SavedView) => {
    resetFilters()
    const f = view.filters
    if (f.priority !== undefined && f.priority !== null) setFilter('priority', f.priority as TaskPriority)
    if (f.assigneeId) setFilter('assigneeId', f.assigneeId as string)
    if (f.labelId) setFilter('labelId', f.labelId as string)
    if (f.status !== undefined && f.status !== null) setFilter('status', f.status as TaskStatus)
    if (f.search) setFilter('search', f.search as string)
  }

  const handleDeleteView = async (viewId: string) => {
    const supabase = createClient()
    await supabase.from('saved_views').delete().eq('id', viewId)
    setSavedViews((prev) => prev.filter((v) => v.id !== viewId))
  }

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">

      {/* Navigation Links */}
      <div className="px-3 pt-3 pb-2 space-y-0.5">
        {NAV_LINKS.filter(({ href }) => canAccessRoute(href, role)).map(({ href, label, icon: Icon }) => {
          const isActive = href === '/'
            ? pathname === '/'
            : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200
                ${isActive
                  ? 'bg-white/[0.1] text-white'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/[0.05]'
                }`}
            >
              <Icon size={15} />
              {label}
            </Link>
          )
        })}
      </div>

      {isOwner && (
      <>
      <div className="mx-3 border-t border-white/[0.06]" />

      {/* Quick Views */}
      <div className="px-3 py-2 space-y-0.5">
        <p className="text-[9px] uppercase tracking-widest text-white/25 font-semibold px-2.5 mb-1">Quick Views</p>
        <button
          onClick={() => handleQuickView('inbox')}
          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-white/40 hover:text-white/70 hover:bg-white/[0.05] transition-colors"
        >
          <Inbox size={15} />
          <span className="flex-1 text-left">Inbox</span>
          {taskCounts.inbox > 0 && (
            <span className="text-[10px] bg-white/[0.08] px-1.5 py-0.5 rounded-full text-white/50">
              {taskCounts.inbox}
            </span>
          )}
        </button>
        <button
          onClick={() => handleQuickView('active')}
          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-white/40 hover:text-white/70 hover:bg-white/[0.05] transition-colors"
        >
          <Zap size={15} />
          <span className="flex-1 text-left">Active Tasks</span>
          {taskCounts.active > 0 && (
            <span className="text-[10px] bg-emerald-400/10 px-1.5 py-0.5 rounded-full text-emerald-400/80">
              {taskCounts.active}
            </span>
          )}
        </button>
      </div>

      <div className="mx-3 border-t border-white/[0.06]" />
      </>
      )}

      {isOwner && (
      <>
      {/* Agents Section */}
      <div className="flex flex-col min-h-0">
        <div
          onClick={() => setAgentsExpanded(!agentsExpanded)}
          role="button"
          className="flex items-center justify-between px-5 py-2 cursor-pointer"
        >
          <div className="flex items-center gap-2">
            {agentsExpanded ? <ChevronDown size={12} className="text-white/25" /> : <ChevronRight size={12} className="text-white/25" />}
            <Users size={14} className="text-white/40" />
            <span className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">Agents</span>
          </div>
          <div className="flex items-center gap-1.5">
            {activeCount > 0 && (
              <span className="text-[10px] font-medium text-emerald-400/80 bg-emerald-400/10 px-1.5 py-0.5 rounded-full">
                {activeCount}
              </span>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); handleCreate() }}
              className="p-1 rounded-lg hover:bg-white/[0.08] text-white/30 hover:text-white/60 transition-colors"
              title="Add agent"
            >
              <Plus size={12} />
            </button>
          </div>
        </div>

        {agentsExpanded && (
          <div className="overflow-y-auto max-h-64 px-2 pb-2 space-y-0.5">
            {loading ? (
              <div className="space-y-2 px-1">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-14 rounded-xl bg-white/[0.04] animate-pulse" />
                ))}
              </div>
            ) : (
              agents.map(agent => (
                <div key={agent.id} className="group relative">
                  <AgentCard
                    agent={agent}
                    selected={selectedAgentId === agent.id || useFiltersStore.getState().filters.assigneeId === agent.id}
                    onClick={() => handleAgentClick(agent.id)}
                  />
                  <button
                    onClick={(e) => { e.stopPropagation(); handleEdit(agent) }}
                    className="absolute top-3 right-3 p-1 rounded-lg bg-white/[0.06] text-white/30 hover:text-white/60 hover:bg-white/[0.1] transition-all opacity-0 group-hover:opacity-100"
                    title="Edit agent"
                  >
                    <Settings size={10} />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Saved Views */}
      {savedViews.length > 0 && (
        <>
          <div className="mx-3 border-t border-white/[0.06]" />
          <div className="px-3 py-2">
            <button
              onClick={() => setViewsExpanded(!viewsExpanded)}
              className="w-full flex items-center gap-2 px-2.5 py-1 mb-1"
            >
              {viewsExpanded ? <ChevronDown size={12} className="text-white/25" /> : <ChevronRight size={12} className="text-white/25" />}
              <Bookmark size={14} className="text-white/40" />
              <span className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">Views</span>
              <span className="text-[9px] bg-white/[0.06] px-1 py-0.5 rounded-full text-white/30 ml-auto">
                {savedViews.length}
              </span>
            </button>
            {viewsExpanded && (
              <div className="space-y-0.5 max-h-32 overflow-y-auto">
                {savedViews.map((view) => (
                  <div key={view.id} className="group flex items-center">
                    <button
                      onClick={() => handleLoadView(view)}
                      className="flex-1 text-left px-2.5 py-1 rounded-lg text-xs text-white/40 hover:text-white/70 hover:bg-white/[0.05] transition-colors truncate"
                    >
                      {view.name}
                    </button>
                    <button
                      onClick={() => handleDeleteView(view.id)}
                      className="p-1 text-white/15 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
      </>
      )}


      {/* Logout — inside scroll area, at bottom */}
      <div
        className="px-3 pt-1"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <div className="border-t border-white/[0.06] pt-2">
          <form action={signout}>
            <button
              type="submit"
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-white/30 hover:text-red-400/70 hover:bg-red-400/[0.05] transition-colors"
            >
              <LogOut size={14} />
              Sign out
            </button>
          </form>
        </div>
      </div>

      </div>{/* end scrollable content */}

      {isOwner && (
        <AgentManageModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          agent={editAgent}
          onSave={onAgentChange}
        />
      )}
    </div>
  )
}
