import { cleanup_api_response } from '@/utils/cleanup-api-response'
import {
  CompletionItem,
  TextItem,
  extract_workspace_and_path
} from '../clipboard-parser'

const extract_path_and_position = (
  line: string
): { path: string; line: number; character: number } | null => {
  const path_pos_regex = /\/\/\s*"?([^"<>\s?*|:]+)"?\s+(\d+):(\d+)/

  const match = line.match(path_pos_regex)

  if (match) {
    const path = match[1]
    const line_num_str = match[2]
    const char_num_str = match[3]

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
}): (CompletionItem | TextItem)[] | null => {
  const lines = params.response.split('\n')
  let code_block_start_index = -1
  let code_block_end_index = -1

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('```')) {
      code_block_start_index = i
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].trim().startsWith('```')) {
          code_block_end_index = j
          break
        }
      }
      break
    }
  }

  if (code_block_start_index === -1) {
    return null
  }

  if (code_block_end_index === -1) {
    code_block_end_index = lines.length - 1
  }

  const first_line_of_block = lines[code_block_start_index + 1]
  const completion_info = extract_path_and_position(first_line_of_block)

  if (!completion_info) {
    return null
  }

  const results: (CompletionItem | TextItem)[] = []
  const text_before = lines.slice(0, code_block_start_index).join('\n').trim()
  if (text_before) {
    results.push({ type: 'text', content: text_before })
  }

  const { workspace_name, relative_path } = extract_workspace_and_path({
    raw_file_path: completion_info.path,
    is_single_root_folder_workspace: params.is_single_root_folder_workspace
  })

  const content_lines = lines.slice(
    code_block_start_index + 2,
    code_block_end_index
  )

  results.push({
    type: 'completion',
    file_path: relative_path,
    content: cleanup_api_response({ content: content_lines.join('\n') }),
    line: completion_info.line,
    character: completion_info.character,
    workspace_name
  })

  const text_after = lines
    .slice(code_block_end_index + 1)
    .join('\n')
    .trim()
  if (text_after) {
    results.push({ type: 'text', content: text_after })
  }

  return results
}
