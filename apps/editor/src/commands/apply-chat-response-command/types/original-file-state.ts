export type OriginalFileState = {
  file_path: string
  content: string
  workspace_name?: string
  cursor_offset?: number
  new_file_path?: string
  new_workspace_name?: string
  file_path_to_restore?: string
  restore_workspace_name?: string
  diff_application_method?: 'recount' | 'search_and_replace'
  file_state?: 'new' | 'deleted'
  is_checked?: boolean
  ai_content?: string
  proposed_content?: string
  current_content?: string
  apply_failed?: boolean
  applied_with_intelligent_update?: boolean
}
