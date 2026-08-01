'use client'
import { KanbanBoard, ListView } from '@/features/tasks/components'
import { useTasks } from '@/features/tasks/hooks/useTasks'
import { useLayoutStore } from '@/shared/stores/layout-store'
import { LayoutGrid, List } from 'lucide-react'

export default function DashboardPage() {
  useTasks()
  const selectedView = useLayoutStore((s) => s.selectedView)
  const setSelectedView = useLayoutStore((s) => s.setSelectedView)

  return (
    <div className="h-full flex flex-col">

      {/* View toggle */}
      <div className="flex items-center gap-1 px-4 pb-1">
        <button
          onClick={() => setSelectedView('kanban')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] transition-colors
            ${selectedView === 'kanban' ? 'bg-white/[0.08] text-white/70' : 'text-white/30 hover:text-white/50 hover:bg-white/[0.04]'}
          `}
        >
          <LayoutGrid size={12} />
          Board
        </button>
        <button
          onClick={() => setSelectedView('list')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] transition-colors
            ${selectedView === 'list' ? 'bg-white/[0.08] text-white/70' : 'text-white/30 hover:text-white/50 hover:bg-white/[0.04]'}
          `}
        >
          <List size={12} />
          List
        </button>
      </div>

      {/* View content */}
      <div className="flex-1 min-h-0">
        {selectedView === 'list' ? <ListView /> : <KanbanBoard />}
      </div>
    </div>
  )
}
