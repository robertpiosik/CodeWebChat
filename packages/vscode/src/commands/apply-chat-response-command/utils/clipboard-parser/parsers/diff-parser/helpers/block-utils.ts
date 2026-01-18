import { TextItem, extract_workspace_and_path } from '../../../clipboard-parser'
import {
  extract_path_with_xml_fallback,
  extract_path_from_potential_string
} from './path-utils'

export const find_file_path_before_block = (params: {
  lines: string[]
  block_start: number
  is_single_root: boolean
  max_lines_back?: number
}): { file_path?: string; workspace_name?: string } => {
  const max_back = params.max_lines_back || 5
  let candidate: { file_path?: string; workspace_name?: string } | undefined

  for (
    let j = params.block_start - 1;
    j >= Math.max(0, params.block_start - max_back);
    j--
  ) {
    const prev_line = params.lines[j].trim()
    if (!prev_line) continue

    const extracted = extract_path_with_xml_fallback(prev_line)

    if (extracted) {
      if (extracted.endsWith('/') || extracted.endsWith('\\')) {
        continue
      }

      const { workspace_name } = extract_workspace_and_path({
        raw_file_path: extracted,
        is_single_root_folder_workspace: params.is_single_root
      })

      // If we find a heading with a path, it takes precedence over anything below it
      if (prev_line.startsWith('###')) {
        return { file_path: extracted, workspace_name }
      }

      if (!candidate) {
        candidate = { file_path: extracted, workspace_name }
      }
    }
  }

  return candidate || {}
}

export const remove_path_line_from_text_block = (params: {
  text_item: TextItem
  target_file_path: string
  is_single_root: boolean
}): void => {
  const content_lines = params.text_item.content.split('\n')
  let path_line_index = -1

  for (let i = content_lines.length - 1; i >= 0; i--) {
    const line = content_lines[i].trim()
    if (line == '') continue

    const extracted = extract_path_from_potential_string(line)

    if (extracted) {
      const { relative_path } = extract_workspace_and_path({
        raw_file_path: extracted,
        is_single_root_folder_workspace: params.is_single_root
      })
      if (relative_path === params.target_file_path) {
        if (line.startsWith('###')) {
          path_line_index = i
        }
        break
      }
    }
  }

  if (path_line_index > -1) {
    const new_content_lines = content_lines.filter(
      (_, index) => index !== path_line_index
    )

    const collapsed_lines: string[] = []
    for (const line of new_content_lines) {
      if (
        line.trim() == '' &&
        collapsed_lines.length > 0 &&
        collapsed_lines[collapsed_lines.length - 1].trim() == ''
      ) {
        continue
      }
      collapsed_lines.push(line)
    }
    const new_content = collapsed_lines.join('\n').trim()

    params.text_item.content = new_content
  }
}
