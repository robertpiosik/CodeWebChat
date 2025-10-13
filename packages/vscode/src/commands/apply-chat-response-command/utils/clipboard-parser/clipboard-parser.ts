import { cleanup_api_response } from '@/utils/cleanup-api-response'
import { extract_path_from_line_of_code } from '@shared/utils/extract-path-from-line-of-code'
import { Diff, extract_diffs } from './extract-diff-patches'

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

export interface ClipboardContent {
  type: 'files' | 'patches' | 'code-completion'
  files?: ClipboardFile[]
  patches?: Diff[]
  code_completion?: ClipboardCodeCompletion
}

export const extract_workspace_and_path = (
  raw_file_path: string,
  is_single_root_folder_workspace: boolean
): { workspace_name?: string; relative_path: string } => {
  const file_path = raw_file_path.replace(/\\/g, '/')
  if (is_single_root_folder_workspace || !file_path.includes('/')) {
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

const has_real_code = (content: string): boolean => {
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

const extract_file_path_from_xml = (line: string): string | null => {
  const match = line.match(/<file\s+path=["']([^"']+)["']/)
  return match ? match[1] : null
}

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
}): ClipboardCodeCompletion | null => {
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
              extract_workspace_and_path(
                completion_info.path,
                params.is_single_root_folder_workspace
              )
            return {
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

export const parse_multiple_files = (params: {
  response: string
  is_single_root_folder_workspace: boolean
}): ClipboardFile[] => {
  // Check if it's a file-content-only format first
  const file_content_result = parse_file_content_only(params)
  if (file_content_result) {
    return [file_content_result]
  }

  // Use Map to keep track of files by their unique identifier (workspace+path)
  const files_map = new Map<string, ClipboardFile>()

  // Use a state machine approach to track code blocks
  let state = 'TEXT' // States: TEXT, BLOCK_START, CONTENT
  let current_file_name = ''
  let current_content = ''
  let is_first_content_line = false
  let current_workspace_name: string | undefined = undefined
  let xml_file_mode = false
  let top_level_xml_file_mode = false
  let in_cdata = false
  let backtick_nesting_level = 0
  let last_seen_file_path_comment: string | null = null

  const lines = params.response.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (state == 'TEXT') {
      const backtick_index = line.indexOf('```')
      if (backtick_index != -1) {
        const before_backticks = line.substring(0, backtick_index)
        if (before_backticks.trim()) {
          const extracted_filename =
            extract_path_from_line_of_code(before_backticks)
          if (extracted_filename) {
            last_seen_file_path_comment = extracted_filename
          }
        }

        const after_backticks = line.substring(backtick_index + 3).trim()
        if (after_backticks) {
          const parts = after_backticks.split(':')
          if (parts.length > 1) {
            const potential_path = parts.slice(1).join(':').trim()
            if (
              potential_path.includes('/') ||
              potential_path.includes('\\') ||
              potential_path.includes('.')
            ) {
              last_seen_file_path_comment = potential_path
            }
          }
        }

        state = 'CONTENT'
        backtick_nesting_level = 1
        current_workspace_name = undefined
        current_file_name = ''
        if (last_seen_file_path_comment) {
          const { workspace_name, relative_path } = extract_workspace_and_path(
            last_seen_file_path_comment,
            params.is_single_root_folder_workspace
          )
          current_file_name = relative_path
          if (workspace_name) {
            current_workspace_name = workspace_name
          }
        }
        last_seen_file_path_comment = null
        current_content = ''
        is_first_content_line = true
        xml_file_mode = false
        top_level_xml_file_mode = false
        in_cdata = false
        continue
      } else if (line.trim().startsWith('<file')) {
        const extracted_filename = extract_file_path_from_xml(line)
        if (extracted_filename) {
          state = 'CONTENT'
          top_level_xml_file_mode = true
          const { workspace_name, relative_path } = extract_workspace_and_path(
            extracted_filename,
            params.is_single_root_folder_workspace
          )
          current_file_name = relative_path
          if (workspace_name) {
            current_workspace_name = workspace_name
          }
          current_content = ''
          last_seen_file_path_comment = null
          continue
        }
      }
      const trimmed_line = line.trim()
      const is_comment =
        trimmed_line.startsWith('//') ||
        trimmed_line.startsWith('#') ||
        trimmed_line.startsWith('/*') ||
        trimmed_line.startsWith('*') ||
        trimmed_line.startsWith('--') ||
        trimmed_line.startsWith('<!--')

      if (is_comment) {
        const extracted_filename = extract_path_from_line_of_code(line)
        if (extracted_filename) {
          last_seen_file_path_comment = extracted_filename
        }
      } else if (trimmed_line !== '') {
        last_seen_file_path_comment = null
      }
    } else if (state == 'CONTENT') {
      if (top_level_xml_file_mode) {
        if (line.trim().startsWith('</file>')) {
          let final_content = current_content.trim()
          const content_lines = final_content.split('\n')
          if (
            content_lines.length >= 2 &&
            content_lines[0].trim().startsWith('```') &&
            content_lines[content_lines.length - 1].trim() == '```'
          ) {
            final_content = content_lines.slice(1, -1).join('\n')
          }

          state = 'TEXT'

          if (current_file_name && has_real_code(final_content)) {
            const file_key = `${
              current_workspace_name || ''
            }:${current_file_name}`

            if (files_map.has(file_key)) {
              const existing_file = files_map.get(file_key)!
              existing_file.content += '\n\n' + final_content
            } else {
              files_map.set(file_key, {
                file_path: current_file_name,
                content: final_content,
                workspace_name: current_workspace_name
              })
            }
          }

          current_file_name = ''
          current_content = ''
          current_workspace_name = undefined
          top_level_xml_file_mode = false
          in_cdata = false
        } else if (line.trim().startsWith('<![CDATA[')) {
          in_cdata = true
        } else if (in_cdata && line.trim().includes(']]>')) {
          in_cdata = false
        } else {
          current_content += (current_content ? '\n' : '') + line
        }
        continue
      }

      const trimmed_line = line.trim()

      // Handle nested backticks
      if (trimmed_line.startsWith('```') && trimmed_line !== '```') {
        backtick_nesting_level++
      } else if (
        trimmed_line == '```' &&
        backtick_nesting_level == 1 &&
        (current_content.trim() == '' ||
          (i > 0 &&
            (lines[i - 1].trim() == '' || lines[i - 1].trim() == '```'))) &&
        (() => {
          for (let j = i + 1; j < lines.length; j++) {
            const next_line = lines[j].trim()
            if (next_line !== '') {
              return !next_line.startsWith('```')
            }
          }
          return false
        })()
      ) {
        // Heuristic: A raw ``` at the start of a block (after the filename comment)
        // or after an empty line is likely opening a nested block.
        backtick_nesting_level++
      } else if (trimmed_line.endsWith('```')) {
        backtick_nesting_level--
      }

      if (backtick_nesting_level <= 0) {
        // End of block
        let content_on_closing_line = ''
        if (line.trim() != '```') {
          const last_backticks_index = line.lastIndexOf('```')
          content_on_closing_line = line.substring(0, last_backticks_index)
        }

        if (content_on_closing_line.trim() != '') {
          if (current_content) {
            current_content += '\n' + content_on_closing_line
          } else {
            current_content = content_on_closing_line
          }
        }

        state = 'TEXT'

        const cleaned_content = current_content

        // Add the collected file if we have a valid filename and it has real code
        if (current_file_name && has_real_code(cleaned_content)) {
          const file_key = `${
            current_workspace_name || ''
          }:${current_file_name}`

          if (files_map.has(file_key)) {
            const existing_file = files_map.get(file_key)!
            existing_file.content += '\n\n' + cleaned_content
          } else {
            files_map.set(file_key, {
              file_path: current_file_name,
              content: cleaned_content,
              workspace_name: current_workspace_name
            })
          }
        }

        current_file_name = ''
        current_content = ''
        is_first_content_line = false
        current_workspace_name = undefined
        xml_file_mode = false
        in_cdata = false
      } else {
        // This is a content line
        if (is_first_content_line && line.trim().startsWith('<file')) {
          const extracted_filename = extract_file_path_from_xml(line)
          if (extracted_filename) {
            const { workspace_name, relative_path } =
              extract_workspace_and_path(
                extracted_filename,
                params.is_single_root_folder_workspace
              )
            current_file_name = relative_path
            if (workspace_name) {
              current_workspace_name = workspace_name
            }
            xml_file_mode = true
            is_first_content_line = false
            continue
          }
        }

        // Check if we're on the first content line and it might contain a filename
        if (is_first_content_line && !xml_file_mode) {
          const trimmed_line = line.trim()
          let extracted_filename: string | null = null

          if (trimmed_line.startsWith('<?php')) {
            if (current_content) {
              current_content += '\n' + line
            } else {
              current_content = line
            }
            continue
          }

          const is_comment =
            trimmed_line.startsWith('//') ||
            trimmed_line.startsWith('#') ||
            trimmed_line.startsWith('/*') ||
            trimmed_line.startsWith('*') ||
            trimmed_line.startsWith('--') ||
            trimmed_line.startsWith('<!--')

          if (is_comment) {
            extracted_filename = extract_path_from_line_of_code(line)
          } else {
            // Heuristic for uncommented file path
            const potential_path = trimmed_line.replace(/\\/g, '/')
            const last_segment = potential_path.split('/').pop()
            if (
              last_segment?.includes('.') &&
              !last_segment?.endsWith('.') &&
              /^[a-zA-Z0-9_./@-]+$/.test(potential_path)
            ) {
              extracted_filename = trimmed_line
            }
          }

          if (extracted_filename) {
            const { workspace_name, relative_path } =
              extract_workspace_and_path(
                extracted_filename,
                params.is_single_root_folder_workspace
              )
            current_file_name = relative_path
            if (workspace_name) {
              current_workspace_name = workspace_name
            }

            // Don't include the filename line in content
            is_first_content_line = false
            continue
          }
        }

        if (xml_file_mode && line.trim().startsWith('<![CDATA[')) {
          in_cdata = true
          continue
        }

        if (xml_file_mode && in_cdata && line.trim().includes(']]>')) {
          in_cdata = false
          continue
        }

        if (xml_file_mode && !in_cdata && line.trim() == '</file>') {
          continue
        }

        is_first_content_line = false

        if (current_content) {
          current_content += '\n' + line
        } else {
          current_content = line
        }
      }
    }
  }

  // Handle edge case: last file in clipboard doesn't have closing ```
  if (state == 'CONTENT' && current_file_name) {
    let cleaned_content = current_content

    if (top_level_xml_file_mode) {
      const final_content = current_content.trim()
      const content_lines = final_content.split('\n')
      if (
        content_lines.length >= 2 &&
        content_lines[0].trim().startsWith('```') &&
        content_lines[content_lines.length - 1].trim() == '```'
      ) {
        cleaned_content = content_lines.slice(1, -1).join('\n')
      } else {
        cleaned_content = final_content
      }
    }

    // Add the collected file if we have a valid filename and it has real code
    if (current_file_name && has_real_code(cleaned_content)) {
      const file_key = `${current_workspace_name || ''}:${current_file_name}`

      if (files_map.has(file_key)) {
        const existing_file = files_map.get(file_key)!
        existing_file.content += '\n\n' + cleaned_content
      } else {
        files_map.set(file_key, {
          file_path: current_file_name,
          content: cleaned_content,
          workspace_name: current_workspace_name
        })
      }
    }
  }

  return Array.from(files_map.values())
}

export const parse_file_content_only = (params: {
  response: string
  is_single_root_folder_workspace: boolean
}): ClipboardFile | null => {
  const lines = params.response.trim().split('\n')

  // Check if the first line looks like a file path comment
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

  const { workspace_name, relative_path } = extract_workspace_and_path(
    extracted_filename,
    params.is_single_root_folder_workspace
  )

  const content = lines.slice(1).join('\n')
  const cleaned_content = content

  if (has_real_code(cleaned_content)) {
    return {
      file_path: relative_path,
      content: cleaned_content,
      workspace_name: workspace_name
    }
  }

  return null
}

export const parse_response = (
  response: string,
  is_single_root_folder_workspace: boolean = true
): ClipboardContent => {
  const code_completion = parse_code_completion({
    response,
    is_single_root_folder_workspace
  })
  if (code_completion) {
    return { type: 'code-completion', code_completion }
  }

  if (
    response.includes('```diff') ||
    response.includes('```patch') ||
    response.startsWith('--- ') ||
    response.startsWith('diff --git')
  ) {
    const patches = extract_diffs(response, is_single_root_folder_workspace)
    if (patches.length) {
      return {
        type: 'patches',
        patches
      }
    }
  }

  const files = parse_multiple_files({
    response,
    is_single_root_folder_workspace
  })

  return {
    type: 'files',
    files
  }
}
