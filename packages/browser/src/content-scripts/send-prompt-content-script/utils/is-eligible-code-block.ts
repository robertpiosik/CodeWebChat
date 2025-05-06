import { extract_path_from_comment } from '@shared/utils/extract-path-from-comment'

export function is_eligible_code_block(
  first_line_text: string
): boolean {
  return (
    !!first_line_text &&
    (first_line_text.startsWith('---') ||
      first_line_text.startsWith('+++') ||
      first_line_text.startsWith('diff --git') ||
      !!extract_path_from_comment(first_line_text))
  )
}
