import { Logger } from '@shared/utils/logger'

export type DiffPatch = {
  file_path: string
  content: string
  workspace_name?: string
  new_file_path?: string
}

const normalize_header_line = (line: string): string => {
  const processed_line = line
    .replace(/\s+\d{4}-\d{2}-\d{2}.*$/, '')
    .replace(/\t.*$/, '')

  if (processed_line.startsWith('--- ')) {
    let path_part = processed_line.substring(4).trim()
    if (path_part.startsWith('"') && path_part.endsWith('"')) {
      path_part = path_part.substring(1, path_part.length - 1)
    }
    if (path_part.startsWith('a/')) {
      path_part = path_part.substring(2)
    }

    if (path_part == '/dev/null') {
      return '--- /dev/null'
    }
    return `--- a/${path_part}`
  }

  if (processed_line.startsWith('+++ ')) {
    let path_part = processed_line.substring(4).trim()
    if (path_part.startsWith('"') && path_part.endsWith('"')) {
      path_part = path_part.substring(1, path_part.length - 1)
    }
    if (path_part.startsWith('b/')) {
      path_part = path_part.substring(2)
    }
    if (path_part == '/dev/null') {
      return '+++ /dev/null'
    }
    return `+++ b/${path_part}`
  }

  return processed_line
}

const process_collected_patch_lines = (
  patch_lines_array: string[]
): DiffPatch | null => {
  const joined_patch_text_for_checks = patch_lines_array.join('\n')
  if (joined_patch_text_for_checks.trim() == '') return null

  const { from_path, to_path } = extract_paths_from_lines(patch_lines_array)

  const is_new_file = from_path == '/dev/null'
  const is_deleted_file = to_path == '/dev/null'
  const is_rename =
    from_path &&
    to_path &&
    from_path != to_path &&
    !is_new_file &&
    !is_deleted_file

  // For new files, file_path is to_path. For deleted files or renamed files, it's from_path.
  const file_path = from_path && from_path != '/dev/null' ? from_path : to_path

  if (!file_path || file_path == '/dev/null') {
    Logger.info({
      function_name: 'process_collected_patch_lines',
      message: 'Could not extract file path from collected patch lines.',
      data: {
        clipboard_start: joined_patch_text_for_checks.substring(0, 200),
        lines_count: patch_lines_array.length
      }
    })
    return null
  }

  const patch_start_idx = find_patch_start_index(patch_lines_array)
  let content_str = build_patch_content(
    patch_lines_array,
    file_path,
    patch_start_idx
  )

  // If it's a rename, we need to modify the patch content to use the old path in both header lines
  if (is_rename) {
    const normalized_to_path_line = normalize_header_line(`+++ ${to_path}`)
    const normalized_from_path_line = normalize_header_line(`+++ ${from_path}`)
    content_str = content_str.replace(
      normalized_to_path_line,
      normalized_from_path_line
    )
  }

  content_str = content_str.trim()

  const patch: DiffPatch = {
    file_path,
    content: ensure_newline_ending(content_str)
  }

  if (is_rename && to_path) {
    patch.new_file_path = to_path
  }

  return patch
}

const extract_code_block_patches = (normalized_text: string): DiffPatch[] => {
  const patches: DiffPatch[] = []
  const lines = normalized_text.split('\n')

  // Parse from end to beginning to find code blocks
  const code_blocks: { start: number; end: number; type: 'diff' | 'patch' }[] =
    []

  // First pass: find all closing ``` and work backwards to find opening ```diff or ```patch
  for (let i = lines.length - 1; i >= 0; i--) {
    const trimmed_line = lines[i].trim()

    if (trimmed_line == '```') {
      // Found closing backticks, now look backwards for opening
      for (let j = i - 1; j >= 0; j--) {
        const opening_line = lines[j].trim()
        if (opening_line == '```diff') {
          code_blocks.unshift({ start: j, end: i, type: 'diff' })
          i = j // Skip to this position to avoid overlapping blocks
          break
        } else if (opening_line == '```patch') {
          code_blocks.unshift({ start: j, end: i, type: 'patch' })
          i = j // Skip to this position to avoid overlapping blocks
          break
        } else if (opening_line.startsWith('```') && opening_line != '```') {
          // Found a different code block, stop searching
          break
        }
      }
    }
  }

  // Process each found code block
  for (const block of code_blocks) {
    const block_lines = lines.slice(block.start + 1, block.end) // Exclude the ``` lines
    const processed_patches = parse_multiple_raw_patches(block_lines)
    patches.push(...processed_patches)
  }

  return patches
}

const parse_multiple_raw_patches = (all_lines: string[]): DiffPatch[] => {
  const patches: DiffPatch[] = []
  let current_patch_lines: string[] = []

  for (const line of all_lines) {
    const is_potential_new_patch_header =
      line.startsWith('--- a/') ||
      line.startsWith('diff --git a/') ||
      line.startsWith('--- "a/')

    if (is_potential_new_patch_header && current_patch_lines.length > 0) {
      const contains_main_header = current_patch_lines.some(
        (l) =>
          l.startsWith('--- a/') ||
          l.startsWith('diff --git a/') ||
          l.startsWith('--- "a/')
      )
      const contains_plus_plus_plus = current_patch_lines.some(
        (l) => l.startsWith('+++ b/') || l.startsWith('+++ "b/')
      )

      if (contains_main_header && contains_plus_plus_plus) {
        const patch_info = process_collected_patch_lines(current_patch_lines)
        if (patch_info) {
          patches.push(patch_info)
        }
        current_patch_lines = [line]
        continue
      }
    }
    current_patch_lines.push(line)
  }

  if (current_patch_lines.length > 0) {
    const patch_info = process_collected_patch_lines(current_patch_lines)
    if (patch_info) {
      patches.push(patch_info)
    }
  }

  return patches
}

export const extract_diff_patches = (clipboard_text: string): DiffPatch[] => {
  const normalized_text = clipboard_text.replace(/\r\n/g, '\n')
  const lines = normalized_text.split('\n')

  const uses_code_blocks = lines.some(
    (line) => line.trim() == '```diff' || line.trim() == '```patch'
  )

  if (uses_code_blocks) {
    return extract_code_block_patches(normalized_text)
  } else {
    return parse_multiple_raw_patches(lines)
  }
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

const find_patch_start_index = (lines: string[]): number => {
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

const build_patch_content = (
  lines: string[],
  file_path: string,
  patch_start_index: number
): string => {
  let patch_content: string

  if (patch_start_index >= 0) {
    const patch_lines = lines.slice(patch_start_index).map((line) => {
      if (line.startsWith('--- ') || line.startsWith('+++ ')) {
        return normalize_header_line(line)
      }
      return line
    })
    patch_content = patch_lines.join('\n')
  } else {
    const content_start_index = lines.findIndex((line) => line.startsWith('@@'))

    if (content_start_index == -1) {
      Logger.info({
        function_name: 'build_patch_content',
        message:
          'No @@ content found, constructing minimal patch headers based on file_path.',
        data: { file_path }
      })
      patch_content = `--- a/${file_path}\n+++ b/${file_path}`
    } else {
      const patch_body_lines = lines.slice(content_start_index)
      const formatted_patch_body_lines = format_hunk_headers(patch_body_lines)
      patch_content = `--- a/${file_path}\n+++ b/${file_path}\n${formatted_patch_body_lines.join(
        '\n'
      )}`
    }
  }

  return ensure_newline_ending(patch_content)
}

const format_hunk_headers = (lines: string[]): string[] => {
  const formatted_lines: string[] = []
  for (const line of lines) {
    const hunk_match = line.match(/^(@@ -\d+(?:,\d+)? \+\d+(?:,\d+)? @@)(.*)$/)
    if (hunk_match && hunk_match[2].trim() != '') {
      formatted_lines.push(hunk_match[1])
      if (hunk_match[2].length > 0) {
        formatted_lines.push(hunk_match[2])
      }
    } else {
      formatted_lines.push(line)
    }
  }
  return formatted_lines
}

const ensure_newline_ending = (content: string): string => {
  let new_content = content
  while (new_content.endsWith('\n')) {
    new_content = new_content.substring(0, new_content.length - 1)
  }
  return new_content + '\n'
}
