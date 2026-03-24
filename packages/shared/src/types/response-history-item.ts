import { FileInPreview, RelevantFileInPreview } from './file-in-preview'

export type ApiConfiguration = {
  provider: string
  model: string
  reasoning_effort?: string
}

export type ResponseHistoryItem = {
  response: string
  raw_instructions?: string
  created_at: number
  lines_added?: number
  lines_removed?: number
  files?: FileInPreview[]
  relevant_files?: RelevantFileInPreview[]
  url?: string
  api_configuration?: ApiConfiguration
  is_unviewed?: boolean
}
