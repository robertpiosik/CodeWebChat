import { Logger } from '@shared/utils/logger'
import { extract_path_from_line_of_code } from '@shared/utils/extract-path-from-line-of-code'
import { extract_workspace_and_path } from '../clipboard-parser'

export type Diff = {
  file_path: string
  content: string
  workspace_name?: string
  new_file_path?: string
}

const normalize_header_line = (
  line: string,
  is_single_root?: boolean
): string => {
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
    if (is_single_root === false) {
      path_part = extract_workspace_and_path(
        path_part,
        is_single_root
      ).relative_path
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
    if (is_single_root === false) {
      path_part = extract_workspace_and_path(
        path_part,
        is_single_root
      ).relative_path
    }
    if (path_part == '/dev/null') {
      return '+++ /dev/null'
    }
    return `+++ b/${path_part}`
  }

  return processed_line
}

const process_collected_patch_lines = (
  patch_lines_array: string[],
  is_single_root: boolean
): Diff | null => {
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
    patch_start_idx,
    is_single_root
  )

  // If it's a rename, we need to modify the patch content to use the old path in both header lines
  if (is_rename) {
    const normalized_to_path_line = normalize_header_line(
      `+++ ${to_path}`,
      is_single_root
    )
    const normalized_from_path_line = normalize_header_line(
      `+++ ${from_path}`,
      is_single_root
    )
    content_str = content_str.replace(
      normalized_to_path_line,
      normalized_from_path_line
    )
  }

  const { workspace_name, relative_path } = extract_workspace_and_path(
    file_path,
    is_single_root
  )

  const patch: Diff = {
    file_path: relative_path,
    workspace_name,
    content: content_str.endsWith('\n') ? content_str : content_str + '\n'
  }

  if (is_rename && to_path) {
    const { workspace_name: new_workspace, relative_path: new_relative } =
      extract_workspace_and_path(to_path, is_single_root)
    patch.new_file_path = new_relative
    if (new_workspace && new_workspace !== workspace_name) {
      patch.workspace_name = new_workspace
    }
  }

  return patch
}

const convert_code_block_to_new_file_diff = (
  lines: string[],
  is_single_root: boolean
): Diff | null => {
  if (lines.length == 0) {
    return null
  }

  // Regex to find file path. It can be commented or not.
  // It handles paths with slashes, backslashes, dots, alphanumerics, underscores, and hyphens.
  const path_regex = /(?:(?:\/\/|#|--|<!--)\s*)?([\w./\\-]+)/
  const xml_path_regex = /<file\s+path=["']([^"']+)["']/

  let file_path: string | undefined
  let path_line_index = -1
  let content_lines: string[] = []

  // Check for XML path format
  const first_line = lines.length > 0 ? lines[0].trim() : ''
  const xml_match = first_line.match(xml_path_regex)

  if (xml_match && xml_match[1]) {
    file_path = xml_match[1].replace(/\\/g, '/')

    const file_tag_start = lines.findIndex((l) => l.trim().startsWith('<file'))
    let file_tag_end = -1
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].trim().startsWith('</file>')) {
        file_tag_end = i
        break
      }
    }

    if (
      file_tag_start !== -1 &&
      file_tag_end !== -1 &&
      file_tag_end > file_tag_start
    ) {
      const inner_lines = lines.slice(file_tag_start + 1, file_tag_end)

      const cdata_start = inner_lines.findIndex((l) =>
        l.trim().startsWith('<![CDATA[')
      )
      let cdata_end = -1
      for (let i = inner_lines.length - 1; i >= 0; i--) {
        if (inner_lines[i].trim().endsWith(']]>')) {
          cdata_end = i
          break
        }
      }

      if (cdata_start !== -1 && cdata_end !== -1 && cdata_end > cdata_start) {
        content_lines = inner_lines.slice(cdata_start + 1, cdata_end)
      } else {
        content_lines = inner_lines
      }
    } else {
      // malformed, maybe path is on first line, and content follows
      content_lines = lines.slice(1)
    }
  } else {
    // Look for a file path in the first few lines of the code block
    for (let i = 0; i < Math.min(lines.length, 5); i++) {
      const line = lines[i].trim()
      const match = line.match(path_regex)

      if (match && match[1]) {
        const potential_path = match[1]

        if (
          (potential_path.includes('.') || potential_path.includes('/')) &&
          !potential_path.includes(' ')
        ) {
          const rest_of_line = line
            .substring(line.indexOf(potential_path) + potential_path.length)
            .trim()
          // e.g. `25:5` for line and column, or `-->` for html comments
          const is_just_path_and_location = /^(?:\d+:\d+)?\s*(-->)?\s*$/.test(
            rest_of_line
          )

          if (is_just_path_and_location) {
            file_path = potential_path.replace(/\\/g, '/') // normalize backslashes
            path_line_index = i
            break // Found it, stop searching.
          }
        }
      }
    }
    if (path_line_index !== -1) {
      content_lines = lines.filter((_, index) => index !== path_line_index)
    }
  }

  if (!file_path) {
    return null
  }

  const { workspace_name, relative_path } = extract_workspace_and_path(
    file_path,
    is_single_root
  )

  const patch_lines = content_lines.map((line) => `+${line}`)
  const patch_content = [
    `--- /dev/null`,
    `+++ b/${relative_path}`,
    `@@ -0,0 +1,${content_lines.length} @@`,
    ...patch_lines
  ].join('\n')

  return {
    file_path: relative_path,
    workspace_name,
    content: patch_content + '\n'
  }
}

const extract_all_code_block_patches = (
  normalized_text: string,
  is_single_root: boolean
): Diff[] => {
  const patches: Diff[] = []
  const lines = normalized_text.split('\n')

  const code_block_regex = /^```(\w*)/

  const code_blocks: { start: number; end: number; type: string }[] = []
  const stack: { start: number; type: string }[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed_line = line.trim()
    const match = trimmed_line.match(code_block_regex)

    if (!match) continue

    const lang = match[1] || ''

    if (
      stack.length > 0 &&
      (stack[stack.length - 1].type == 'diff' ||
        stack[stack.length - 1].type == 'patch')
    ) {
      if (line.match(/^[+\- ]/)) {
        continue
      }
    }

    if (lang == '' && stack.length > 0 && trimmed_line == '```') {
      const open_block = stack.pop()!
      code_blocks.push({
        start: open_block.start,
        end: i,
        type: open_block.type
      })
    } else {
      stack.push({ start: i, type: lang })
    }
  }

  const closed_blocks = [...code_blocks].sort((a, b) => a.start - b.start)

  for (const open_block of stack) {
    let end_line = lines.length
    for (const closed_block of closed_blocks) {
      if (closed_block.start > open_block.start) {
        end_line = closed_block.start
        break
      }
    }
    code_blocks.push({
      start: open_block.start,
      end: end_line,
      type: open_block.type
    })
  }

  code_blocks.sort((a, b) => a.start - b.start)

  // Process each found code block
  for (const block of code_blocks) {
    const block_lines = lines.slice(block.start + 1, block.end) // Exclude the ``` lines
    if (block.type == 'diff' || block.type == 'patch') {
      const processed_patches = parse_multiple_raw_patches(
        block_lines,
        is_single_root
      )
      patches.push(...processed_patches)
    } else {
      // Check if there's a comment line before the code block with a file path
      let workspace_hint: string | undefined
      if (block.start > 0) {
        const prev_line = lines[block.start - 1].trim()
        const extracted = extract_path_from_line_of_code(prev_line)
        if (extracted) {
          const { workspace_name } = extract_workspace_and_path(
            extracted,
            is_single_root
          )
          workspace_hint = workspace_name
        }
      }
      const patch = convert_code_block_to_new_file_diff(
        block_lines,
        is_single_root
      )
      if (patch) {
        if (workspace_hint && !patch.workspace_name) {
          patch.workspace_name = workspace_hint
        }
        patches.push(patch)
      }
    }
  }

  return patches
}

const parse_multiple_raw_patches = (
  all_lines: string[],
  is_single_root: boolean
): Diff[] => {
  const patches: Diff[] = []
  let current_patch_lines: string[] = []

  for (const line of all_lines) {
    const is_potential_new_patch_header =
      line.startsWith('--- ') || line.startsWith('diff --git ')

    if (is_potential_new_patch_header && current_patch_lines.length > 0) {
      const contains_main_header = current_patch_lines.some(
        (l) => l.startsWith('--- ') || l.startsWith('diff --git ')
      )
      const contains_plus_plus_plus = current_patch_lines.some((l) =>
        l.startsWith('+++ ')
      )

      if (contains_main_header && contains_plus_plus_plus) {
        let should_split = false
        if (line.startsWith('diff --git ')) {
          should_split = true
        } else if (line.startsWith('--- ')) {
          const contains_hunk = current_patch_lines.some((l) =>
            l.startsWith('@@')
          )
          if (contains_hunk) {
            should_split = true
          }
        }
        if (should_split) {
          const patch_info = process_collected_patch_lines(
            current_patch_lines,
            is_single_root
          )
          if (patch_info) {
            patches.push(patch_info)
          }
          current_patch_lines = [line]
          continue
        }
      }
    }
    current_patch_lines.push(line)
  }

  if (current_patch_lines.length > 0) {
    const patch_info = process_collected_patch_lines(
      current_patch_lines,
      is_single_root
    )
    if (patch_info) {
      patches.push(patch_info)
    }
  }

  return patches
}

export const extract_diffs = (
  clipboard_text: string,
  is_single_root: boolean = true
): Diff[] => {
  const normalized_text = clipboard_text.replace(/\r\n/g, '\n')
  const lines = normalized_text.split('\n')

  const code_block_regex = /^```(\w*)/
  const uses_code_blocks = lines.some((line) =>
    code_block_regex.test(line.trim())
  )

  if (uses_code_blocks) {
    return extract_all_code_block_patches(normalized_text, is_single_root)
  } else {
    return parse_multiple_raw_patches(lines, is_single_root)
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
  patch_start_index: number,
  is_single_root?: boolean
): string => {
  let patch_content: string

  if (patch_start_index >= 0) {
    let patch_lines = lines.slice(patch_start_index)

    const hunk_start_idx = patch_lines.findIndex((line) =>
      line.startsWith('@@')
    )

    if (hunk_start_idx > 0) {
      const header_lines = patch_lines.slice(0, hunk_start_idx)
      const body_lines = patch_lines.slice(hunk_start_idx)

      let from_line: string | undefined
      let to_line: string | undefined
      let diff_git_line: string | undefined

      for (const line of header_lines) {
        if (line.startsWith('--- ')) from_line = line
        if (line.startsWith('+++ ')) to_line = line
        if (line.startsWith('diff --git ')) diff_git_line = line
      }

      const final_header: string[] = []
      if (diff_git_line) final_header.push(diff_git_line)
      if (from_line) final_header.push(from_line)
      if (to_line) final_header.push(to_line)

      patch_lines = [...final_header, ...body_lines]
    }

    patch_content = patch_lines
      .map((line) => {
        if (line.startsWith('--- ') || line.startsWith('+++ ')) {
          return normalize_header_line(line, is_single_root)
        }
        return line
      })
      .join('\n')
  } else {
    const content_start_index = lines.findIndex((line) => line.startsWith('@@'))

    if (content_start_index == -1) {
      Logger.info({
        function_name: 'build_patch_content',
        message:
          'No @@ content found, constructing minimal patch headers based on file_path.',
        data: { file_path }
      })
      const relative_file_path =
        is_single_root === false
          ? extract_workspace_and_path(file_path, false).relative_path
          : file_path
      patch_content = `--- a/${relative_file_path}\n+++ b/${relative_file_path}`
    } else {
      const patch_body_lines = lines.slice(content_start_index)
      const formatted_patch_body_lines = format_hunk_headers(patch_body_lines)
      const relative_file_path =
        is_single_root === false
          ? extract_workspace_and_path(file_path, is_single_root).relative_path
          : file_path
      patch_content = `--- a/${relative_file_path}\n+++ b/${relative_file_path}\n${formatted_patch_body_lines.join(
        '\n'
      )}`
    }
  }

  return patch_content
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
