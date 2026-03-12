import {
  extract_diffs,
  parse_code_at_cursor,
  parse_multiple_files,
  parse_relevant_files
} from './parsers'
import {
  parse_subtask_directives,
  SubtaskDirective
} from './parsers/subtask-directives-parser'

export type FileItem = {
  type: 'file'
  file_path: string
  content: string
  workspace_name?: string
  renamed_from?: string
  is_deleted?: boolean
}

export type DiffItem = {
  type: 'diff'
  file_path: string
  content: string
  workspace_name?: string
  new_file_path?: string
}

export type CodeAtCursorItem = {
  type: 'code-at-cursor'
  file_path: string
  content: string
  line: number
  character: number
  workspace_name?: string
}

export type RelevantFilesItem = {
  type: 'relevant-files'
  file_paths: string[]
}

export type SubtasksItem = {
  type: 'subtasks'
  subtasks: SubtaskDirective[]
}

export type TextItem = {
  type: 'text'
  content: string
}

export type InlineFileItem = {
  type: 'inline-file'
  content: string
  language?: string
}

export type ClipboardItem =
  | FileItem
  | DiffItem
  | CodeAtCursorItem
  | TextItem
  | InlineFileItem
  | RelevantFilesItem
  | SubtasksItem

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

export const parse_response = (params: {
  response: string
  is_single_root_folder_workspace?: boolean
}): ClipboardItem[] => {
  const is_single_root_folder_workspace =
    params.is_single_root_folder_workspace ?? true
  const items: ClipboardItem[] = []

  const code_at_cursor_items = parse_code_at_cursor({
    response: params.response,
    is_single_root_folder_workspace
  })

  if (code_at_cursor_items && code_at_cursor_items.length > 0) {
    items.push(...code_at_cursor_items)
  }

  const subtasks = parse_subtask_directives(params.response) as SubtasksItem[]
  if (subtasks && subtasks.length > 0) {
    items.push(...subtasks)
  }

  const relevant_files = parse_relevant_files({ response: params.response })
  if (relevant_files) {
    items.push(relevant_files)
  }

  const processed_response = params.response.replace(/``````/g, '```\n```')

  const hunk_header_regex = /^(@@\s+-\d+(?:,\d+)?\s+\+\d+(?:,\d+)?\s+@@)/m
  const diff_header_regex = /^---\s+.+\n\+\+\+\s+.+/m
  const git_diff_header_regex = /^diff --git /m

  if (
    hunk_header_regex.test(processed_response) ||
    diff_header_regex.test(processed_response) ||
    git_diff_header_regex.test(processed_response) ||
    processed_response.includes('```diff') ||
    processed_response.includes('```patch')
  ) {
    const patches_or_text = extract_diffs({
      clipboard_text: processed_response,
      is_single_root: is_single_root_folder_workspace
    })
    if (patches_or_text.length) {
      items.push(...patches_or_text)
    }
  }

  const file_items = parse_multiple_files({
    response: processed_response,
    is_single_root_folder_workspace
  })
  items.push(...file_items)

  return items
}
