export type FileInReview = {
  file_path: string
  workspace_name?: string
  is_new?: boolean
  is_deleted?: boolean
  lines_added: number
  lines_removed: number
  is_fallback?: boolean
  is_replaced?: boolean
}
