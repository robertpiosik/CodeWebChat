import { cleanup_api_response } from '@/helpers/cleanup-api-response'
import { extract_path_from_line_of_code } from '@shared/utils/extract-path-from-line-of-code'
import { extract_diff_patches, DiffPatch } from '../patch-handler'

export interface ClipboardFile {
  file_path: string
  content: string
  workspace_name?: string
}

export interface ClipboardContent {
  type: 'files' | 'patches'
  files?: ClipboardFile[]
  patches?: DiffPatch[]
}

// Helper function to check if path starts with a workspace name and extract it
const extract_workspace_and_path = (
  file_path: string,
  is_single_root_folder_workspace = false
): { workspace_name?: string; relative_path: string } => {
  // If workspace has only one root folder, don't try to extract workspace name
  if (is_single_root_folder_workspace) {
    return { relative_path: file_path }
  }

  // Check if the path might contain a workspace prefix (contains a slash)
  if (!file_path.includes('/')) {
    return { relative_path: file_path }
  }

  // Split by first slash to check for workspace prefix
  const first_slash_index = file_path.indexOf('/')
  if (first_slash_index > 0) {
    const possible_workspace = file_path.substring(0, first_slash_index)
    const rest_of_path = file_path.substring(first_slash_index + 1)

    // Return both the possible workspace name and the rest of the path
    return {
      workspace_name: possible_workspace,
      relative_path: rest_of_path
    }
  }

  return { relative_path: file_path }
}

// Helper function to check if content has real code (not just comments or empty)
const has_real_code = (content: string): boolean => {
  // Remove comments and check if there's any non-whitespace content
  const lines = content.split('\n')

  // Filter out empty lines and lines that are just comments
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

// Helper function to extract file path from XML-style file tag
const extract_file_path_from_xml = (line: string): string | null => {
  const match = line.match(/<file\s+path=["']([^"']+)["']/)
  return match ? match[1] : null
}

export const parse_clipboard_multiple_files = (params: {
  clipboard_text: string
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

  // Split text into lines for easier processing
  const lines = params.clipboard_text.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Check for code block start
    if (state == 'TEXT' && line.trim().startsWith('```')) {
      state = 'CONTENT'
      current_workspace_name = undefined // Reset workspace name for new block
      current_file_name = '' // Reset filename for new block
      current_content = ''
      is_first_content_line = true
      xml_file_mode = false
      in_cdata = false
      continue
    }
    // Collect content lines
    else if (state == 'CONTENT') {
      // Check if line is end of code block
      if (line.trim() == '```') {
        // We've found the end of the block
        state = 'TEXT'

        // Clean up the collected content before adding/appending
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
            // Append cleaned content
            existing_file.content += '\n\n' + cleaned_content
          } else {
            files_map.set(file_key, {
              file_path: current_file_name,
              // Use cleaned content
              content: cleaned_content,
              workspace_name: current_workspace_name
            })
          }
        }

        // Reset state variables
        current_file_name = ''
        current_content = ''
        is_first_content_line = false
        current_workspace_name = undefined
        xml_file_mode = false
        in_cdata = false
      } else {
        // Check for XML-style file tag
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

        // Check for CDATA start
        if (xml_file_mode && line.trim().startsWith('<![CDATA[')) {
          in_cdata = true
          continue
        }

        // Check for CDATA end
        if (xml_file_mode && in_cdata && line.trim().includes(']]>')) {
          in_cdata = false
          continue
        }

        // Check for XML closing tag
        if (xml_file_mode && !in_cdata && line.trim() == '</file>') {
          continue
        }

        // We're not on first line anymore for subsequent iterations
        is_first_content_line = false

        // Add to content
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
    // Clean up the collected content before adding/appending
    const cleaned_content = cleanup_api_response({ content: current_content })

    // Only add if it has real code
    if (has_real_code(cleaned_content)) {
      const file_key = `${current_workspace_name || ''}:${current_file_name}`

      if (files_map.has(file_key)) {
        const existing_file = files_map.get(file_key)!
        // Append cleaned content
        existing_file.content += '\n\n' + cleaned_content
      } else {
        files_map.set(file_key, {
          file_path: current_file_name,
          // Use cleaned content
          content: cleaned_content,
          workspace_name: current_workspace_name
        })
      }
    }
  }

  return Array.from(files_map.values())
}

export const parse_file_content_only = (params: {
  clipboard_text: string
  is_single_root_folder_workspace: boolean
}): ClipboardFile | null => {
  const lines = params.clipboard_text.trim().split('\n')

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

  // Get content (everything after the first line)
  const content = lines.slice(1).join('\n')
  const cleaned_content = cleanup_api_response({ content })

  // Only return if it has real code
  if (has_real_code(cleaned_content)) {
    return {
      file_path: relative_path,
      content: cleaned_content,
      workspace_name: workspace_name
    }
  }

  return null
}

export const parse_clipboard_content = async (
  clipboard_text: string,
  is_single_root_folder_workspace: boolean
): Promise<ClipboardContent> => {
  // First check for diff patches
  if (
    clipboard_text.includes('```diff') ||
    clipboard_text.includes('```patch') ||
    clipboard_text.startsWith('--- ')
  ) {
    const patches = await extract_diff_patches(clipboard_text)
    if (patches.length > 0) {
      return {
        type: 'patches',
        patches
      }
    }
  }

  // If no patches found, parse as regular files
  const files = parse_clipboard_multiple_files({
    clipboard_text,
    is_single_root_folder_workspace
  })

  return {
    type: 'files',
    files
  }
}
