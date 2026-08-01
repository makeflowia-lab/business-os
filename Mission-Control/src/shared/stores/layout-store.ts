import { create } from 'zustand'

export type ViewType = 'kanban' | 'list' | 'activity' | 'calendar'

interface LayoutState {
  leftSidebarOpen: boolean
  rightSidebarOpen: boolean
  selectedView: ViewType
  chatSessionsPanelOpen: boolean
  toggleLeftSidebar: () => void
  toggleRightSidebar: () => void
  setSelectedView: (view: ViewType) => void
  closeLeftSidebar: () => void
  closeRightSidebar: () => void
  toggleChatSessionsPanel: () => void
  closeChatSessionsPanel: () => void
}

export const useLayoutStore = create<LayoutState>((set) => ({
  leftSidebarOpen: true,
  rightSidebarOpen: false,
  selectedView: 'kanban',
  chatSessionsPanelOpen: false,
  toggleLeftSidebar: () => set((s) => ({ leftSidebarOpen: !s.leftSidebarOpen })),
  toggleRightSidebar: () => set((s) => ({ rightSidebarOpen: !s.rightSidebarOpen })),
  setSelectedView: (view) => set({ selectedView: view }),
  closeLeftSidebar: () => set({ leftSidebarOpen: false }),
  closeRightSidebar: () => set({ rightSidebarOpen: false }),
  toggleChatSessionsPanel: () => set((s) => ({ chatSessionsPanelOpen: !s.chatSessionsPanelOpen })),
  closeChatSessionsPanel: () => set({ chatSessionsPanelOpen: false }),
}))
