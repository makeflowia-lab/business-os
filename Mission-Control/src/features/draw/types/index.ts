export interface DrawPage {
  page_id: string
  user_id: string
  name: string
  page_elements: DrawElements | null
  is_deleted: boolean
  created_at: string
  updated_at: string
}

export interface DrawElements {
  elements: readonly Record<string, unknown>[]
  files?: Record<string, unknown>
}
