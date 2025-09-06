export type OriginalFileState = {
  file_path: string
  content: string
  is_new: boolean
  workspace_name?: string
  cursor_offset?: number
  new_file_path?: string
  file_path_to_restore?: string
}
