import { cleanup_api_response } from '@/helpers/cleanup-api-response'
import { extract_filename_from_comment } from '@shared/utils/extract-filename-from-comment'

export interface ClipboardFile {
  file_path: string
  content: string
  workspace_name?: string
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

export const parse_clipboard_multiple_files = (params: {
  clipboard_text: string
  is_single_root_folder_workspace: boolean
}): ClipboardFile[] => {
  // Use Map to keep track of files by their unique identifier (workspace+path)
  const files_map = new Map<string, ClipboardFile>()

  // Use a state machine approach to track code blocks
  let state = 'TEXT' // States: TEXT, BLOCK_START, CONTENT
  let current_file_name = ''
  let current_content = ''
  let is_first_content_line = false
  let current_workspace_name: string | undefined = undefined

  // Split text into lines for easier processing
  const lines = params.clipboard_text.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Check for code block start
    if (state == 'TEXT' && line.trim().startsWith('```')) {
      state = 'BLOCK_START'
      current_workspace_name = undefined // Reset workspace name for new block
      current_file_name = '' // Reset filename for new block

      // Check if this line also contains the filename
      const name_match = line.match(/name=(?:"([^"]+)"|([^\s"]+))/)
      if (name_match) {
        current_file_name = (name_match[1] || name_match[2]).trim()

        const { workspace_name, relative_path } = extract_workspace_and_path(
          current_file_name,
          params.is_single_root_folder_workspace
        )
        if (workspace_name) {
          current_workspace_name = workspace_name
          current_file_name = relative_path
        }

        state = 'CONTENT'
        current_content = ''
        is_first_content_line = true
        continue
      } else {
        // No name= attribute, prepare to try to extract filename from content
        state = 'CONTENT'
        current_content = ''
        is_first_content_line = true
        continue
      }
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

        // Add the collected file if we have a valid filename
        if (current_file_name) {
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
      } else {
        // Check if we're on the first content line and it might contain a filename in a comment
        if (is_first_content_line && !current_file_name) {
          if (
            line.trim().startsWith('//') ||
            line.trim().startsWith('#') ||
            line.trim().startsWith('--') ||
            line.trim().startsWith('/*') ||
            line.trim().startsWith('*')
          ) {
            const extracted_filename = extract_filename_from_comment(line)
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

  return Array.from(files_map.values())
}

export const is_multiple_files_clipboard = (clipboardText: string): boolean => {
  // Check for standard format with name= attribute
  const file_block_regex = /```(\w+)?\s*name=(?:"[^"]+"|[^\s"]+)/g

  // Also check for code blocks that might have filename comments
  const code_block_regex = /```(\w+)?[\s\S]*?```/g

  // Check for standard format first
  let match_count = 0

  while (file_block_regex.exec(clipboardText) !== null) {
    match_count++
    if (match_count >= 1) {
      return true
    }
  }

  // If standard format not found, check for code blocks with potential comment filenames
  const code_blocks = [...clipboardText.matchAll(code_block_regex)]

  for (const block of code_blocks) {
    if (block[0]) {
      const lines = block[0].split('\n')
      // Skip first line (```language)
      if (lines.length > 1) {
        // Check if second line looks like a comment with filename
        const secondLine = lines[1].trim()
        if (
          (secondLine.startsWith('//') ||
            secondLine.startsWith('#') ||
            secondLine.startsWith('/*') ||
            secondLine.startsWith('*')) &&
          extract_filename_from_comment(secondLine)
        ) {
          return true
        }
      }
    }
  }

  return false
}
