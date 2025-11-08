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

  const first_line = lines[0].trim()
  if (
    !(
      first_line.startsWith('//') ||
      first_line.startsWith('#') ||
      first_line.startsWith('/*') ||
      first_line.startsWith('*') ||
      first_line.startsWith('--') ||
      first_line.startsWith('<!--')
    )
  ) {
    return null
  }

  const extracted_filename = extract_path_from_line_of_code(first_line)
  if (!extracted_filename) return null

  const { workspace_name, relative_path } = extract_workspace_and_path({
    raw_file_path: extracted_filename,
    is_single_root_folder_workspace: params.is_single_root_folder_workspace
  })

  const content = lines.slice(1).join('\n')
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
