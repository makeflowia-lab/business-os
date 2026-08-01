'use client'
import { useState, useRef, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { formatDistanceToNow } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { useTasksStore } from '@/shared/stores/tasks-store'
import { PRIORITY_CONFIG, STATUS_CONFIG, formatDueDate, getDueDateColor } from '../utils/priority'
import type { TaskWithAssignees, TaskStatus, TaskPriority } from '@/types/database'

const QUICK_STATUSES: { value: TaskStatus; label: string }[] = [
  { value: 'inbox', label: 'Inbox' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'done', label: 'Done' },
  { value: 'archived', label: 'Archived' },
]

interface TaskCardProps {
  task: TaskWithAssignees
  isDragOverlay?: boolean
}

export function TaskCard({ task, isDragOverlay }: TaskCardProps) {
  const selectTask = useTasksStore((s) => s.selectTask)
  const selectedTaskId = useTasksStore((s) => s.selectedTaskId)
  const updateTask = useTasksStore((s) => s.updateTask)
  const toggleMultiSelect = useTasksStore((s) => s.toggleMultiSelect)
  const isMultiSelected = useTasksStore((s) => s.selectedTaskIds.has(task.id))

  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const contextRef = useRef<HTMLDivElement>(null)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: 'task', task },
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return
    function handleClick(e: MouseEvent) {
      if (contextRef.current && !contextRef.current.contains(e.target as Node)) {
        setContextMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [contextMenu])

  const handleTitleSave = async () => {
    if (!editTitle.trim() || editTitle.trim() === task.title) {
      setIsEditing(false)
      return
    }
    const trimmed = editTitle.trim()
    updateTask(task.id, { title: trimmed })
    setIsEditing(false)
    const supabase = createClient()
    await supabase.from('tasks').update({ title: trimmed }).eq('id', task.id)
  }

  const handleQuickStatus = async (status: TaskStatus) => {
    setContextMenu(null)
    updateTask(task.id, { status })
    const supabase = createClient()
    await supabase.from('tasks').update({ status }).eq('id', task.id)
  }

  const handleQuickPriority = async (priority: TaskPriority) => {
    setContextMenu(null)
    updateTask(task.id, { priority })
    const supabase = createClient()
    await supabase.from('tasks').update({ priority }).eq('id', task.id)
  }

  const isSelected = selectedTaskId === task.id
  const isFocused = useTasksStore((s) => s.focusedTaskId === task.id)
  const firstAssignee = task.assignees[0]
  const timeAgo = task.updated_at
    ? formatDistanceToNow(new Date(task.updated_at), { addSuffix: true })
    : null

  const borderStyle = task.border_color
    ? { borderLeftColor: task.border_color, borderLeftWidth: '3px' }
    : {}

  const priority = task.priority ?? 0
  const priorityConfig = PRIORITY_CONFIG[priority]
  const statusConfig = STATUS_CONFIG[task.status]
  const dueDateStr = formatDueDate(task.due_at)
  const dueDateColor = getDueDateColor(task.due_at)
  const labels = task.labels ?? []
  const taskId = `MC-${task.sequence_number}`
  const subtaskCount = task.subtasks?.length ?? 0
  const subtaskDone = task.subtasks?.filter((s) => s.status === 'done').length ?? 0
  const createdDate = task.created_at
    ? new Date(task.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null

  return (
    <div
      ref={isDragOverlay ? undefined : setNodeRef}
      style={{ ...style, ...borderStyle }}
      {...(isDragOverlay ? {} : attributes)}
      {...(isDragOverlay ? {} : listeners)}
      onClick={(e) => {
        if (e.shiftKey || e.metaKey) {
          e.preventDefault()
          toggleMultiSelect(task.id)
        } else {
          selectTask(task.id)
        }
      }}
      onContextMenu={(e) => {
        if (isDragOverlay) return
        e.preventDefault()
        setContextMenu({ x: e.clientX, y: e.clientY })
      }}
      className={`
        bg-white/[0.04] border border-white/[0.08] rounded-xl p-3
        hover:bg-white/[0.06] hover:border-white/[0.12]
        transition-all duration-200 cursor-grab active:cursor-grabbing
        ${isSelected ? 'bg-white/[0.08] border-white/[0.15]' : ''}
        ${isFocused && !isSelected ? 'ring-1 ring-white/20 bg-white/[0.06]' : ''}
        ${isMultiSelected ? 'ring-1 ring-purple-500/40 bg-purple-500/[0.06]' : ''}
        ${isDragOverlay ? 'shadow-2xl shadow-black/40 rotate-2 scale-105' : ''}
      `}
    >
      {/* Top row: Status icon + ID + Priority + Labels */}
      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
        <span className={`text-[10px] leading-none ${statusConfig.color}`}>{statusConfig.icon}</span>
        <span className="text-[10px] font-mono text-white/35 leading-none">{taskId}</span>
        {priority > 0 && (
          <span className={`text-[10px] ${priorityConfig.color}`}>
            {priorityConfig.icon}
          </span>
        )}
        {labels.slice(0, 2).map((label) => (
          <span
            key={label.id}
            className="text-[9px] px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: `${label.color}20`, color: label.color }}
          >
            {label.name}
          </span>
        ))}
        {labels.length > 2 && (
          <span className="text-[9px] text-white/30">+{labels.length - 2}</span>
        )}
      </div>

      {/* Title - double-click to edit */}
      {isEditing ? (
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onBlur={handleTitleSave}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleTitleSave()
            if (e.key === 'Escape') setIsEditing(false)
            e.stopPropagation()
          }}
          onClick={(e) => e.stopPropagation()}
          autoFocus
          className="w-full bg-white/[0.08] border border-white/[0.15] rounded px-1.5 py-0.5 text-sm font-medium text-white outline-none mb-2"
        />
      ) : (
        <h4
          onDoubleClick={(e) => {
            e.stopPropagation()
            setEditTitle(task.title)
            setIsEditing(true)
          }}
          className="text-sm font-medium text-white line-clamp-2 mb-2"
        >
          {task.title}
        </h4>
      )}

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/[0.06] text-white/50 border border-white/[0.06]"
            >
              {tag}
            </span>
          ))}
          {task.tags.length > 3 && (
            <span className="text-[10px] text-white/30">
              +{task.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer: Assignee + Due Date + Timestamp */}
      <div className="flex items-center justify-between mt-1">
        <div className="flex items-center gap-2">
          {firstAssignee ? (
            <div className="flex items-center gap-1.5">
              <span className="text-sm">{firstAssignee.avatar}</span>
              <span className="text-[11px] text-white/50 truncate max-w-[80px]">
                {firstAssignee.name}
              </span>
            </div>
          ) : (
            <span className="text-[11px] text-white/30 italic">Unassigned</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {subtaskCount > 0 && (
            <span className="text-[10px] text-white/30 flex-shrink-0">
              {subtaskDone}/{subtaskCount}
            </span>
          )}
          {dueDateStr && (
            <span className={`text-[10px] flex-shrink-0 ${dueDateColor}`}>
              {dueDateStr}
            </span>
          )}
          {task.estimate && (
            <span className="text-[10px] text-white/25 bg-white/[0.04] px-1 py-0.5 rounded">
              {task.estimate}pt
            </span>
          )}
          {!dueDateStr && createdDate && (
            <span className="text-[10px] text-white/25 flex-shrink-0">
              {createdDate}
            </span>
          )}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          ref={contextRef}
          className="fixed z-50 bg-[#15151f] border border-white/[0.1] rounded-xl shadow-2xl shadow-black/60 overflow-hidden py-1 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <div className="px-3 py-1.5 text-[10px] uppercase tracking-widest text-white/30 font-semibold">
            Status
          </div>
          {QUICK_STATUSES.map((s) => (
            <button
              key={s.value}
              onClick={(e) => { e.stopPropagation(); handleQuickStatus(s.value) }}
              className={`w-full text-left px-3 py-1.5 text-xs transition-colors
                ${task.status === s.value ? 'text-white bg-white/[0.06]' : 'text-white/60 hover:bg-white/[0.06]'}
              `}
            >
              {s.label}
            </button>
          ))}
          <div className="border-t border-white/[0.06] my-1" />
          <div className="px-3 py-1.5 text-[10px] uppercase tracking-widest text-white/30 font-semibold">
            Priority
          </div>
          {([1, 2, 3, 4, 0] as TaskPriority[]).map((p) => {
            const cfg = PRIORITY_CONFIG[p]
            return (
              <button
                key={p}
                onClick={(e) => { e.stopPropagation(); handleQuickPriority(p) }}
                className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${cfg.color}
                  ${(task.priority ?? 0) === p ? 'bg-white/[0.06]' : 'hover:bg-white/[0.06]'}
                `}
              >
                {cfg.icon} {cfg.label}
              </button>
            )
          })}
          <div className="border-t border-white/[0.06] my-1" />
          <button
            onClick={(e) => {
              e.stopPropagation()
              setContextMenu(null)
              setEditTitle(task.title)
              setIsEditing(true)
            }}
            className="w-full text-left px-3 py-1.5 text-xs text-white/60 hover:bg-white/[0.06] transition-colors"
          >
            Edit title
          </button>
        </div>
      )}
    </div>
  )
}
