import { Logger } from '@/helpers/logger'

export type DiffPatch = {
  file_path: string
  content: string
  workspace_name?: string
}

const process_collected_patch_lines = (
  patch_lines_array: string[]
): DiffPatch | null => {
  const joined_patch_text_for_checks = patch_lines_array.join('\n')
  if (joined_patch_text_for_checks.trim() === '') return null

  const file_path = extract_file_path_from_lines(patch_lines_array)

  if (!file_path) {
    Logger.log({
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

  content_str = content_str.trim()

  return {
    file_path,
    content: ensure_newline_ending(content_str)
  }
}

const extract_code_block_patches = (normalized_text: string): DiffPatch[] => {
  const patches: DiffPatch[] = []
  const lines = normalized_text.split('\n')
  let in_diff_block = false
  let current_patch_lines: string[] = []

  for (const line of lines) {
    const trimmed_line = line.trim()

    if (trimmed_line == '```diff' || trimmed_line == '```patch') {
      if (current_patch_lines.length > 0 && !in_diff_block) {
        const patch_info = process_collected_patch_lines(current_patch_lines)
        if (patch_info) {
          patches.push(patch_info)
        }
      }
      in_diff_block = true
      current_patch_lines = []
      continue
    }

    if (trimmed_line === '```') {
      if (in_diff_block) {
        if (current_patch_lines.length > 0) {
          const patch_info = process_collected_patch_lines(current_patch_lines)
          if (patch_info) patches.push(patch_info)
        }
        current_patch_lines = []
      }
      in_diff_block = false
      continue
    }

    if (in_diff_block) {
      const is_potential_new_patch_header =
        line.startsWith('diff --git a/') || line.startsWith('--- a/')

      if (is_potential_new_patch_header && current_patch_lines.length > 0) {
        const contains_plus_plus_plus = current_patch_lines.some((l) =>
          l.startsWith('+++ b/')
        )
        const contains_main_header = current_patch_lines.some(
          (l) => l.startsWith('--- a/') || l.startsWith('diff --git a/')
        )

        if (contains_plus_plus_plus && contains_main_header) {
          const patch_info = process_collected_patch_lines(current_patch_lines)
          if (patch_info) patches.push(patch_info)
          current_patch_lines = [line]
          continue
        }
      }
      current_patch_lines.push(line)
    }
  }

  if (in_diff_block && current_patch_lines.length > 0) {
    const patch_info = process_collected_patch_lines(current_patch_lines)
    if (patch_info) {
      patches.push(patch_info)
    }
  }

  return patches
}

const parse_multiple_raw_patches = (all_lines: string[]): DiffPatch[] => {
  const patches: DiffPatch[] = []
  let current_patch_lines: string[] = []

  for (const line of all_lines) {
    const is_potential_new_patch_header =
      line.startsWith('--- a/') || line.startsWith('diff --git a/')

    if (is_potential_new_patch_header && current_patch_lines.length > 0) {
      const contains_main_header = current_patch_lines.some(
        (l) => l.startsWith('--- a/') || l.startsWith('diff --git a/')
      )
      const contains_plus_plus_plus = current_patch_lines.some((l) =>
        l.startsWith('+++ b/')
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

const extract_file_path_from_lines = (lines: string[]): string | undefined => {
  for (let i = 0; i < lines.length; i++) {
    const file_path_match = lines[i].match(/^\+\+\+ b\/([^\t]+)/)
    if (file_path_match) {
      return file_path_match[1]
    }
  }

  for (const line of lines) {
    const git_diff_match = line.match(/^diff --git a\/(.+) b\/(.+)$/)
    if (git_diff_match) {
      return git_diff_match[2]
    }
  }

  return undefined
}

const find_patch_start_index = (lines: string[]): number => {
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^\+\+\+ b\//)) {
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
        if (lines[j].startsWith('diff --git') || lines[j].startsWith('@@'))
          break
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
      if (line.startsWith('--- a/') || line.startsWith('+++ b/')) {
        return line.replace(/\s+\d{4}-\d{2}-\d{2}.*$/, '').replace(/\t.*$/, '')
      }
      return line
    })
    patch_content = patch_lines.join('\n')
  } else {
    const content_start_index = lines.findIndex((line) => line.startsWith('@@'))

    if (content_start_index == -1) {
      Logger.log({
        function_name: 'build_patch_content',
        message: 'No @@ content found, constructing minimal patch headers.',
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
    if (hunk_match && hunk_match[2].trim() !== '') {
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
