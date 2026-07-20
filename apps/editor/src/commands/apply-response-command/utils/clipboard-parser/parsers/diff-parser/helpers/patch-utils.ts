import { extract_workspace_and_path } from '../../../clipboard-parser'
import { strip_quotes } from './path-utils'

export const normalize_header_line = (params: {
  line: string
  is_single_root: boolean
}): string => {
  const processed_line = params.line.replace(/\s+\d{4}-\d{2}-\d{2}.*$/, '')

  if (processed_line.startsWith('--- ')) {
    let path_part = strip_quotes(processed_line.substring(4).trim())
    if (path_part.startsWith('a/')) {
      path_part = path_part.substring(2)
    }
    if (params.is_single_root === false) {
      path_part = extract_workspace_and_path({
        raw_file_path: path_part,
        is_single_root_folder_workspace: params.is_single_root
      }).relative_path
    }

    if (path_part == '/dev/null') {
      return '--- /dev/null'
    }
    return `--- a/${path_part}`
  }

  if (processed_line.startsWith('+++ ')) {
    let path_part = strip_quotes(processed_line.substring(4).trim())
    if (path_part.startsWith('b/')) {
      path_part = path_part.substring(2)
    }
    if (params.is_single_root === false) {
      path_part = extract_workspace_and_path({
        raw_file_path: path_part,
        is_single_root_folder_workspace: params.is_single_root
      }).relative_path
    }
    if (path_part == '/dev/null') {
      return '+++ /dev/null'
    }
    return `+++ b/${path_part}`
  }

  return processed_line
}

export const extract_paths_from_lines = (
  lines: string[]
): { from_path?: string; to_path?: string } => {
  let from_path: string | undefined
  let to_path: string | undefined

  for (const line of lines) {
    const git_diff_match = line.match(/^diff --git a\/(.+?) b\/(.+)$/)
    if (git_diff_match) {
      if (git_diff_match[2]) to_path = git_diff_match[2]
      if (git_diff_match[1]) from_path = git_diff_match[1]
    }
    const from_match = line.match(/^--- (?:a\/|"a\/)?([^\t"]+)"?(?:\t.*)?$/)
    if (from_match && from_match[1]) from_path = from_match[1]
    const to_match = line.match(/^\+\+\+ (?:b\/|"b\/)?([^\t"]+)"?(?:\t.*)?$/)
    if (to_match && to_match[1]) to_path = to_match[1]
  }
  return { from_path, to_path }
}

export const find_patch_start_index = (lines: string[]): number => {
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('+++ ')) {
      for (let j = i - 1; j >= 0; j--) {
        if (lines[j].startsWith('--- ')) {
          if (j > 0 && lines[j - 1].startsWith('diff --git')) {
            return j
          }
          return j
        }
      }
      break
    }
  }

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('diff --git')) {
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].startsWith('--- ')) {
          return j
        }
        if (lines[j].startsWith('diff --git') || lines[j].startsWith('@@')) {
          break
        }
      }
    }
  }

  return -1
}

export const format_hunk_headers = (lines: string[]): string[] => {
  const formatted_lines: string[] = []
  for (const line of lines) {
    const hunk_match = line.match(/^(@@ -\d+(?:,\d+)? \+\d+(?:,\d+)? @@)(.*)$/)
    if (hunk_match && hunk_match[2].trim() != '') {
      formatted_lines.push(hunk_match[1])
      if (hunk_match[2].length > 0) {
        formatted_lines.push(hunk_match[2])
      }
    } else if (line.startsWith('@@') && !hunk_match) {
      const context = line.substring(2).trim()
      formatted_lines.push('@@ -0,0 +0,0 @@')
      if (context) {
        formatted_lines.push(' ' + context)
      }
    } else {
      formatted_lines.push(line)
    }
  }
  return formatted_lines
}
