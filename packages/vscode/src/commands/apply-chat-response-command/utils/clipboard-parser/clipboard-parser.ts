import { cleanup_api_response } from '@/utils/cleanup-api-response'
import { extract_path_from_line_of_code } from '@shared/utils/extract-path-from-line-of-code'
import { DiffPatch, extract_diff_patches } from './extract-diff-patches'

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
  patches?: DiffPatch[]
  code_completion?: ClipboardCodeCompletion
}

const extract_workspace_and_path = (
  file_path: string,
  is_single_root_folder_workspace = false
): { workspace_name?: string; relative_path: string } => {
  // If workspace has only one root folder, don't try to extract workspace name
  if (is_single_root_folder_workspace) {
    return { relative_path: file_path }
  }

  if (!file_path.includes('/')) {
    return { relative_path: file_path }
  }

  const first_slash_index = file_path.indexOf('/')
  if (first_slash_index > 0) {
    const possible_workspace = file_path.substring(0, first_slash_index)
    const rest_of_path = file_path.substring(first_slash_index + 1)
    return {
      workspace_name: possible_workspace,
      relative_path: rest_of_path
    }
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
    const lineNumStr = match[2] || match[5] || match[8]
    const charNumStr = match[3] || match[6] || match[9]

    if (path && lineNumStr && charNumStr) {
      return {
        path,
        line: parseInt(lineNumStr, 10),
        character: parseInt(charNumStr, 10)
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
              file_path: relative_path.replace(/\\/g, '/'),
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
  let in_cdata = false

  const lines = params.response.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (state == 'TEXT' && line.trim().startsWith('```')) {
      state = 'CONTENT'
      current_workspace_name = undefined
      current_file_name = ''
      current_content = ''
      is_first_content_line = true
      xml_file_mode = false
      in_cdata = false
      continue
    } else if (state == 'CONTENT') {
      if (line.trim().endsWith('```')) {
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

        const cleaned_content = cleanup_api_response({
          content: current_content
        })

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

        // Check if we're on the first content line and it might contain a filename in a comment
        if (is_first_content_line && !xml_file_mode) {
          if (
            line.trim().startsWith('//') ||
            line.trim().startsWith('#') ||
            line.trim().startsWith('/*') ||
            line.trim().startsWith('*') ||
            line.trim().startsWith('--') ||
            line.trim().startsWith('<!--')
          ) {
            const extracted_filename = extract_path_from_line_of_code(line)
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

              // Don't include the comment line in content
              is_first_content_line = false
              continue
            }
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
    const cleaned_content = cleanup_api_response({ content: current_content })

    if (has_real_code(cleaned_content)) {
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
  const cleaned_content = cleanup_api_response({ content })

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
    const patches = extract_diff_patches(response)
    return {
      type: 'patches',
      patches
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
