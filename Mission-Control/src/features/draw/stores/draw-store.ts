import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface PageCache {
  elements: readonly Record<string, unknown>[]
  files?: Record<string, unknown>
  name: string
  updatedAt: string
}

interface DrawStore {
  cache: Record<string, PageCache>
  setPageCache: (pageId: string, data: PageCache) => void
  getPageCache: (pageId: string) => PageCache | undefined
}

export const useDrawStore = create<DrawStore>()(
  persist(
    (set, get) => ({
      cache: {},
      setPageCache: (pageId, data) =>
        set((state) => {
          const current = state.cache[pageId]
          if (!current || new Date(data.updatedAt) > new Date(current.updatedAt)) {
            return { cache: { ...state.cache, [pageId]: data } }
          }
          return state
        }),
      getPageCache: (pageId) => get().cache[pageId],
    }),
    { name: 'draw-cache' },
  ),
)
