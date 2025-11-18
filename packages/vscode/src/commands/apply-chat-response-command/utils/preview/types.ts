import { FileInPreview } from '@shared/types/file-in-preview'

export type CodeReviewDecision =
  | { jump_to: { file_path: string; workspace_name?: string } }
  | { accepted_files: FileInPreview[]; created_at?: number }

export type CodeReviewResult = {
  decision: CodeReviewDecision
  new_content: string
  temp_file_path: string
}

export type ReviewableFile = FileInPreview & {
  content: string
}

export type PreparedFile = {
  reviewable_file: ReviewableFile
  sanitized_path: string
  original_content: string
  temp_file_path: string
  file_exists: boolean
  content_to_restore?: string
}
