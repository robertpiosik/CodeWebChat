export type OriginalFileState = {
  file_path: string
  content: string
  is_new?: boolean
  workspace_name?: string
  cursor_offset?: number
  new_file_path?: string
  file_path_to_restore?: string
  diff_application_method?: 'recount' | 'search_and_replace'
  is_replaced?: boolean
  is_deleted?: boolean
  is_checked?: boolean
  ai_content?: string
}
