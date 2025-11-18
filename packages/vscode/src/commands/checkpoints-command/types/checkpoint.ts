import { ResponseHistoryItem } from '@shared/types/response-history-item'

export interface GitCheckpointData {
  branch: string
  commit_hash: string
  folder_name: string
}

export interface Checkpoint {
  timestamp: number
  title: string
  description?: string
  is_temporary?: boolean
  starred?: boolean
  git_data?: Record<string, GitCheckpointData> // folder name -> git data
  uses_git?: boolean
  response_history?: ResponseHistoryItem[]
  response_preview_item_created_at?: number
}
