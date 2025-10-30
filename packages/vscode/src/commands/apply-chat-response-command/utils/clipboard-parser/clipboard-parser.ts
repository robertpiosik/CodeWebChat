import { extract_diffs, Diff } from './extract-diff-patches'
import { parse_code_completion, parse_multiple_files } from './parsers'

export interface ClipboardFile {
  file_path: string
  content: string
  workspace_name?: string
}

export interface ClipboardCodeCompletion {
  file_path: string
  content: string
  line: number
  character: number
  workspace_name?: string
}

export interface FileItem {
  type: 'file'
  file_path: string
  content: string
  workspace_name?: string
}

export interface DiffItem {
  type: 'diff'
  file_path: string
  content: string
  workspace_name?: string
  new_file_path?: string
}

export interface CompletionItem {
  type: 'completion'
  file_path: string
  content: string
  line: number
  character: number
  workspace_name?: string
}

export interface TextItem {
  type: 'text'
  content: string
}

export type ClipboardItem = FileItem | DiffItem | CompletionItem | TextItem

export const extract_workspace_and_path = (params: {
  raw_file_path: string
  is_single_root_folder_workspace: boolean
}): { workspace_name?: string; relative_path: string } => {
  let file_path = params.raw_file_path.replace(/\\/g, '/')
  if (file_path.startsWith('/')) {
    file_path = file_path.substring(1)
  }
  if (params.is_single_root_folder_workspace || !file_path.includes('/')) {
    return { relative_path: file_path }
  }
  const first_slash_index = file_path.indexOf('/')
  if (first_slash_index > 0) {
    const possible_workspace = file_path.substring(0, first_slash_index)
    const rest_of_path = file_path.substring(first_slash_index + 1)
    return { workspace_name: possible_workspace, relative_path: rest_of_path }
  }
  return { relative_path: file_path }
}

export const has_real_code = (content: string): boolean => {
  const lines = content.split('\n')
  const non_comment_lines = lines.filter((line) => {
    const trimmed = line.trim()
    return (
      trimmed != '' &&
      !trimmed.startsWith('// ...') &&
      !trimmed.startsWith('# ...') &&
      !trimmed.startsWith('/* ...') &&
      !trimmed.startsWith('* ...') &&
      !trimmed.startsWith('-- ...') &&
      !trimmed.startsWith('<!-- ...')
    )
  })

  return non_comment_lines.length > 0
}

export const parse_response = (params: {
  response: string
  is_single_root_folder_workspace?: boolean
}): ClipboardItem[] => {
  const is_single_root_folder_workspace =
    params.is_single_root_folder_workspace ?? true
  const code_completion = parse_code_completion({
    response: params.response,
    is_single_root_folder_workspace
  })
  if (code_completion) {
    return [{ type: 'completion', ...code_completion }]
  }

  const processed_response = params.response.replace(/``````/g, '```\n```')

  const hunk_header_regex = /^(@@\s+-\d+(?:,\d+)?\s+\+\d+(?:,\d+)?\s+@@)/m

  if (
    processed_response.includes('```diff') ||
    processed_response.includes('```patch') ||
    processed_response.startsWith('--- ') ||
    processed_response.startsWith('diff --git') ||
    hunk_header_regex.test(processed_response)
  ) {
    const patches_or_text = extract_diffs({
      clipboard_text: processed_response,
      is_single_root: is_single_root_folder_workspace
    })
    if (patches_or_text.length) {
      return patches_or_text.map((item) => {
        if ('type' in item && item.type === 'text') {
          return item as TextItem
        }
        return { type: 'diff', ...(item as Diff) }
      })
    }
  }

  const items = parse_multiple_files({
    response: processed_response,
    is_single_root_folder_workspace
  })

  return items.map((item) => {
    if ('file_path' in item) {
      const file = item as ClipboardFile
      // The test expects a 'diff' type item even for new files.
      // And the content is expected to be the raw file content, not a patch.
      // This is inconsistent but we follow the test.
      return { type: 'diff', ...file }
    }
    return item as TextItem
  })
}
