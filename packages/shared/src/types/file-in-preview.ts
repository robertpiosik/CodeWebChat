export type FileInPreview = {
  type: 'file'
  file_path: string
  is_checked: boolean
  workspace_name?: string
  is_new?: boolean
  is_deleted?: boolean
  lines_added: number
  lines_removed: number
  is_fallback?: boolean
  is_replaced?: boolean
  diff_fallback_method?: 'recount' | 'search_and_replace'
  content?: string
}

export type TextContentInPreview = {
  type: 'text'
  content: string
}

export type ItemInPreview = FileInPreview | TextContentInPreview
