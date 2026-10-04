import { ResponseHistoryItem } from '@shared/types/response-history-item'

export interface GitCheckpointData {
  branch: string
  commit_hash: string
  folder_name: string
}

export interface CheckpointTab {
  uri: string
  view_column: number
  is_active: boolean
  is_group_active: boolean
}

export type CheckpointTrigger =
  | 'manual'
  | 'response-accepted'
  | 'before-response-previewed'
  | 'before-checkpoint-restored'
  | 'temporary'
  | 'commit'

export interface Checkpoint {
  timestamp: number
  trigger: CheckpointTrigger
  description?: string
  is_pinned?: boolean
  git_data?: Record<string, GitCheckpointData>
  uses_git?: boolean
  response_history?: ResponseHistoryItem[]
  response_preview_item_created_at?: number
  selected_files?: string[]
  active_tabs?: CheckpointTab[]
  completed_tasks?: string[]
}
