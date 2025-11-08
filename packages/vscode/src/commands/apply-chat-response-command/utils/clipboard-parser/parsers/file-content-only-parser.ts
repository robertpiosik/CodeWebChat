import { extract_path_from_line_of_code } from '@shared/utils/extract-path-from-line-of-code'
import {
  FileItem,
  extract_workspace_and_path,
  has_real_code
} from '../clipboard-parser'

export const parse_file_content_only = (params: {
  response: string
  is_single_root_folder_workspace: boolean
}): FileItem | null => {
  if (params.response.includes('```')) {
    return null
  }

  const lines = params.response.trim().split('\n')

  if (lines.length < 2) return null

  let extracted_filename: string | null = null
  let path_line_idx = -1

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const is_comment =
      line.startsWith('//') ||
      line.startsWith('#') ||
      line.startsWith('/*') ||
      line.startsWith('*') ||
      line.startsWith('--') ||
      line.startsWith('<!--')

    if (!is_comment) {
      return null
    }

    extracted_filename = extract_path_from_line_of_code(line)
    if (extracted_filename) {
      path_line_idx = i
      break
    }
  }

  if (!extracted_filename) {
    return null
  }

  let content_start_index = path_line_idx + 1

  let in_multiline_comment = false
  for (let i = 0; i <= path_line_idx; i++) {
    const line = lines[i].trim()
    if (line.startsWith('/*') || line.startsWith('/**')) {
      in_multiline_comment = true
    }
    if (in_multiline_comment && line.endsWith('*/')) {
      in_multiline_comment = false
    }
  }

  if (in_multiline_comment) {
    for (let i = path_line_idx + 1; i < lines.length; i++) {
      if (lines[i].trim().endsWith('*/')) {
        content_start_index = i + 1
        break
      }
    }
  }

  const { workspace_name, relative_path } = extract_workspace_and_path({
    raw_file_path: extracted_filename,
    is_single_root_folder_workspace: params.is_single_root_folder_workspace
  })

  const content = lines.slice(content_start_index).join('\n')
  const cleaned_content = content

  if (has_real_code(cleaned_content)) {
    return {
      type: 'file',
      file_path: relative_path,
      content: cleaned_content,
      workspace_name: workspace_name
    }
  }

  return null
}
