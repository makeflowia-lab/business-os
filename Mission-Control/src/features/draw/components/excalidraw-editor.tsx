'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { MessageCircle } from 'lucide-react'
import { getDrawData, saveDrawData } from '../services/draw-service'
import { useDrawStore } from '../stores/draw-store'
import { DrawChatPanel } from './DrawChatPanel'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import type { NonDeletedExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import type { BinaryFiles } from '@excalidraw/excalidraw/types'

interface Props {
  pageId: string
  ExcalidrawComponent: React.ComponentType<Record<string, unknown>>
}

export function ExcalidrawEditor({ pageId, ExcalidrawComponent }: Props) {
  const router = useRouter()
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null)
  const [name, setName] = useState('New Page')
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const nameRef = useRef(name)
  nameRef.current = name

  const { setPageCache, getPageCache } = useDrawStore()

  // Load data from Supabase
  useEffect(() => {
    if (!api || loaded) return

    getDrawData(pageId).then((page) => {
      if (!page) {
        router.push('/draw')
        return
      }

      setName(page.name)

      const elems = page.page_elements?.elements ?? []
      const files = page.page_elements?.files ?? {}

      api.updateScene({
        elements: elems as NonDeletedExcalidrawElement[],
      })

      if (files && Object.keys(files).length > 0) {
        api.addFiles(Object.values(files) as BinaryFiles[keyof BinaryFiles][])
      }

      setLoaded(true)
    })
  }, [api, pageId, loaded, router])

  // Auto-save every 3 seconds
  const save = useCallback(async () => {
    if (!api) return

    const elements = api.getSceneElements()
    const files = api.getFiles()
    const cached = getPageCache(pageId)

    if (cached && JSON.stringify(cached.elements) === JSON.stringify(elements)) {
      return
    }

    setSaving(true)
    const now = new Date().toISOString()

    setPageCache(pageId, {
      elements,
      files: files as unknown as Record<string, unknown>,
      name: nameRef.current,
      updatedAt: now,
    })

    try {
      await saveDrawData(
        pageId,
        elements as unknown as Record<string, unknown>[],
        nameRef.current,
        files as unknown as Record<string, unknown>,
      )
    } catch (err) {
      console.error('Failed to save drawing:', err)
    } finally {
      setSaving(false)
    }
  }, [api, pageId, getPageCache, setPageCache])

  useEffect(() => {
    const interval = setInterval(save, 3000)
    return () => clearInterval(interval)
  }, [save])

  return (
    <div className="flex flex-col h-full w-full">
      {/* Toolbar */}
      <div className="shrink-0 flex items-center gap-2 px-4 py-2 border-b border-white/[0.06]">
        <button
          onClick={() => router.push('/draw')}
          className="text-xs text-white/40 hover:text-white/70 transition-colors"
        >
          &larr; Back
        </button>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="bg-transparent border border-white/[0.08] rounded-lg px-3 py-1 text-sm text-white/80 w-48 focus:outline-none focus:border-white/20"
          placeholder="Page title"
        />
        <button
          onClick={save}
          disabled={saving}
          className="px-3 py-1 rounded-lg text-xs font-medium bg-white/[0.08] text-white/60 hover:bg-white/[0.12] hover:text-white/80 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        {saving && (
          <span className="text-[10px] text-white/30">Syncing...</span>
        )}

        {/* Spacer + Chat toggle */}
        <div className="ml-auto">
          <button
            onClick={() => setChatOpen((o) => !o)}
            className={`p-1.5 rounded-lg transition-colors ${
              chatOpen
                ? 'bg-violet-500/20 text-violet-300'
                : 'text-white/40 hover:text-white/70 hover:bg-white/[0.08]'
            }`}
            title={chatOpen ? 'Cerrar chat' : 'Chat con asistente'}
          >
            <MessageCircle size={16} />
          </button>
        </div>
      </div>

      {/* Canvas + Chat panel */}
      <div className="flex-1 min-h-0 flex flex-row">
        {/* Canvas */}
        <div className="flex-1 min-w-0 min-h-0 transition-all duration-300">
          <ExcalidrawComponent
            excalidrawAPI={(a: unknown) => setApi(a as ExcalidrawImperativeAPI)}
            theme="dark"
            autoFocus
          />
        </div>

        {/* Assistant chat sidebar */}
        {chatOpen && (
          <div className="w-80 shrink-0 min-h-0 animate-in slide-in-from-right duration-200">
            <DrawChatPanel
              excalidrawAPI={api}
              onClose={() => setChatOpen(false)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
