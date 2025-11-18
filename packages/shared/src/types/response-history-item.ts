import { FileInPreview } from './file-in-preview'

export type ResponseHistoryItem = {
  response: string
  raw_instructions?: string
  created_at: number
  lines_added?: number
  lines_removed?: number
  files?: FileInPreview[]
}
