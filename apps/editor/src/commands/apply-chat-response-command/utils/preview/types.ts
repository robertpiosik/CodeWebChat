import {
  FileInPreview,
  RelevantFileInPreview
} from '@shared/types/file-in-preview'
import * as vscode from 'vscode'

export type PreviewDecision =
  | { jump_to: { file_path: string; workspace_name?: string } }
  | {
      accepted_files: (FileInPreview | RelevantFileInPreview)[]
      created_at?: number
    }

export type PreviewResult = {
  decision: PreviewDecision
  new_content: string
  original_uri: string
  active_file_uri?: string
  active_position?: vscode.Position
}

export type PreviewableFile = FileInPreview & {
  content: string
}

export type PreparedFile = {
  previewable_file: PreviewableFile
  sanitized_path: string
  original_content: string
  original_uri: string
  file_exists: boolean
  content_to_restore?: string
}
