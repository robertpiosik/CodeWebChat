export type FileInPreview = {
  type: 'file'
  file_path: string
  is_checked: boolean
  workspace_name?: string
  file_state?: 'new' | 'deleted'
  lines_added: number
  lines_removed: number
  diff_application_method?: 'recount' | 'search_and_replace'
  content?: string
  proposed_content?: string
  apply_failed?: boolean
  ai_content?: string
  is_applying?: boolean
  apply_status?: 'waiting' | 'thinking' | 'receiving' | 'done' | 'retrying'
  apply_progress?: number
  apply_tokens_per_second?: number
}

export type TextContentInPreview = {
  type: 'text'
  content: string
}

export type ItemInPreview = FileInPreview | TextContentInPreview
