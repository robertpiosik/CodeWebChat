import { cleanup_api_response } from '@/utils/cleanup-api-response'
import { CompletionItem, extract_workspace_and_path } from '../clipboard-parser'

const extract_path_and_position = (
  line: string
): { path: string; line: number; character: number } | null => {
  const path_pos_regex =
    /(?:\/\/|#|--|<!--)\s*"?([^"<>\s?*|:]+)"?\s+(\d+):(\d+)|(?:\/\*)\s*"?([^"<>\s?*|:]+)"?\s+(\d+):(\d+)|\*\s*"?([^"<>\s?*|:]+)"?\s+(\d+):(\d+)/

  const match = line.match(path_pos_regex)

  if (match) {
    const path = match[1] || match[4] || match[7]
    const line_num_str = match[2] || match[5] || match[8]
    const char_num_str = match[3] || match[6] || match[9]

    if (path && line_num_str && char_num_str) {
      return {
        path,
        line: parseInt(line_num_str, 10),
        character: parseInt(char_num_str, 10)
      }
    }
  }
  return null
}

export const parse_code_completion = (params: {
  response: string
  is_single_root_folder_workspace: boolean
}): CompletionItem | null => {
  const lines = params.response.split('\n')
  let in_code_block = false
  let first_line_of_block: string | null = null
  let content_lines: string[] = []

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      if (in_code_block) {
        if (first_line_of_block) {
          const completion_info = extract_path_and_position(first_line_of_block)
          if (completion_info) {
            const { workspace_name, relative_path } =
              extract_workspace_and_path({
                raw_file_path: completion_info.path,
                is_single_root_folder_workspace:
                  params.is_single_root_folder_workspace
              })
            return {
              type: 'completion',
              file_path: relative_path,
              content: cleanup_api_response({
                content: content_lines.join('\n')
              }),
              line: completion_info.line,
              character: completion_info.character,
              workspace_name
            }
          }
        }
        in_code_block = false
        first_line_of_block = null
        content_lines = []
      } else {
        in_code_block = true
      }
      continue
    }

    if (in_code_block) {
      if (first_line_of_block === null) {
        first_line_of_block = line
      } else {
        content_lines.push(line)
      }
    }
  }

  // Handle unclosed block at end of file
  if (in_code_block && first_line_of_block) {
    const completion_info = extract_path_and_position(first_line_of_block)
    if (completion_info) {
      // This case is not handled and will result in returning null.
    }
  }

  return null
}
