export type FileInReview = {
  file_path: string
  workspace_name?: string
  is_new?: boolean
  lines_added: number
  lines_removed: number
}
