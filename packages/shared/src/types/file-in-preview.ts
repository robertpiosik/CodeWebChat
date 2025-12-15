export type FileInPreview = {
  type: 'file'
  file_path: string
  is_checked: boolean
  workspace_name?: string
  file_state?: 'new' | 'deleted'
  lines_added: number
  lines_removed: number
  is_replaced?: boolean
  is_edited_by_conflict_markers?: boolean
  diff_application_method?: 'recount' | 'search_and_replace'
  content?: string
}

export type TextContentInPreview = {
  type: 'text'
  content: string
}

export type ItemInPreview = FileInPreview | TextContentInPreview
