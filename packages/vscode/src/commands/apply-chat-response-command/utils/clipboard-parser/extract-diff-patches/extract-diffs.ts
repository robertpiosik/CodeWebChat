import { Logger } from '@shared/utils/logger'
import { extract_path_from_line_of_code } from '@shared/utils/extract-path-from-line-of-code'
import { extract_workspace_and_path } from '../clipboard-parser'

export type Diff = {
  type: 'diff'
  file_path: string
  content: string
  workspace_name?: string
  new_file_path?: string
}

type TextBlock = {
  type: 'text'
  content: string
}

export type DiffOrTextBlock = Diff | TextBlock

const normalize_path = (path: string): string => {
  return path.replace(/\\/g, '/')
}

const strip_quotes = (path: string): string => {
  if (path.startsWith('"') && path.endsWith('"')) {
    return path.substring(1, path.length - 1)
  }
  return path
}

const is_valid_file_path = (potential_path: string): boolean => {
  return (
    !potential_path.endsWith('/') &&
    !potential_path.endsWith('\\') &&
    (potential_path.includes('.') || potential_path.includes('/')) &&
    !potential_path.includes(' ') &&
    /[a-zA-Z0-9]/.test(potential_path)
  )
}

const extract_path_from_potential_string = (line: string) => {
  let extracted = extract_path_from_line_of_code(line)

  if (!extracted) {
    let potential_path = line
    if (potential_path.endsWith(':')) {
      potential_path = potential_path.slice(0, -1).trim()
    }
    const backtick_match = potential_path.match(/`([^`]+)`/)
    if (backtick_match && backtick_match[1]) {
      potential_path = backtick_match[1]
    }

    if (
      potential_path &&
      (potential_path.includes('/') ||
        potential_path.includes('\\') ||
        potential_path.includes('.')) &&
      !potential_path.endsWith('.') &&
      /^[a-zA-Z0-9_./@-]+$/.test(potential_path)
    ) {
      extracted = potential_path
    }
  }

  return extracted
}

const extract_path_with_xml_fallback = (line: string) => {
  let extracted = extract_path_from_line_of_code(line)

  if (!extracted) {
    const xml_match = line.match(/^<[^>]+>([^<]+)<\/[^>]+>$/)
    if (xml_match && xml_match[1]) {
      const potential_path = xml_match[1].trim()
      if (
        potential_path &&
        (potential_path.includes('/') ||
          potential_path.includes('\\') ||
          potential_path.includes('.')) &&
        !potential_path.includes(' ')
      ) {
        extracted = potential_path
      }
    }
  }

  if (!extracted) {
    const match = line.match(/`([^`]+)`/)
    if (match && match[1]) {
      const potential_path = match[1]
      if (
        potential_path.includes('/') ||
        potential_path.includes('\\') ||
        potential_path.includes('.')
      ) {
        extracted = potential_path
      }
    }
  }

  return extracted
}

const find_file_path_before_block = (params: {
  lines: string[]
  block_start: number
  is_single_root: boolean
  max_lines_back?: number
}): { file_path?: string; workspace_name?: string } => {
  const max_back = params.max_lines_back || 5

  for (
    let j = params.block_start - 1;
    j >= Math.max(0, params.block_start - max_back);
    j--
  ) {
    const prev_line = params.lines[j].trim()
    if (!prev_line) continue

    const extracted = extract_path_with_xml_fallback(prev_line)

    if (extracted) {
      if (extracted.endsWith('/') || extracted.endsWith('\\')) {
        continue
      }

      let all_intermediate_lines_empty = true
      for (let k = j + 1; k < params.block_start; k++) {
        if (params.lines[k].trim() !== '') {
          all_intermediate_lines_empty = false
          break
        }
      }

      if (all_intermediate_lines_empty) {
        const { workspace_name } = extract_workspace_and_path({
          raw_file_path: extracted,
          is_single_root_folder_workspace: params.is_single_root
        })
        return { file_path: extracted, workspace_name }
      }
    }
  }

  return {}
}

const remove_path_line_from_text_block = (params: {
  text_item: TextBlock
  target_file_path: string
  is_single_root: boolean
}): void => {
  const content_lines = params.text_item.content.split('\n')
  let path_line_index = -1

  for (let i = content_lines.length - 1; i >= 0; i--) {
    const line = content_lines[i].trim()
    if (line == '') continue

    const extracted = extract_path_from_potential_string(line)

    if (extracted) {
      const { relative_path } = extract_workspace_and_path({
        raw_file_path: extracted,
        is_single_root_folder_workspace: params.is_single_root
      })
      if (relative_path === params.target_file_path) {
        path_line_index = i
        break
      }
    }
  }

  if (path_line_index > -1) {
    const new_content_lines = content_lines.filter(
      (_, index) => index !== path_line_index
    )

    const collapsed_lines: string[] = []
    for (const line of new_content_lines) {
      if (
        line.trim() == '' &&
        collapsed_lines.length > 0 &&
        collapsed_lines[collapsed_lines.length - 1].trim() === ''
      ) {
        continue
      }
      collapsed_lines.push(line)
    }
    const new_content = collapsed_lines.join('\n').trim()

    params.text_item.content = new_content
  }
}

const normalize_header_line = (params: {
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

const process_collected_patch_lines = (params: {
  patch_lines_array: string[]
  is_single_root: boolean
}): Diff | null => {
  const joined_patch_text_for_checks = params.patch_lines_array.join('\n')
  if (joined_patch_text_for_checks.trim() == '') return null

  const { from_path, to_path } = extract_paths_from_lines(
    params.patch_lines_array
  )

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
        lines_count: params.patch_lines_array.length
      }
    })
    return null
  }

  const patch_start_idx = find_patch_start_index(params.patch_lines_array)
  let content_str = build_patch_content({
    lines: params.patch_lines_array,
    file_path,
    patch_start_index: patch_start_idx,
    is_single_root: params.is_single_root
  })

  // If it's a rename, we need to modify the patch content to use the old path in both header lines
  if (is_rename) {
    const normalized_to_path_line = normalize_header_line({
      line: `+++ ${to_path}`,
      is_single_root: params.is_single_root
    })
    const normalized_from_path_line = normalize_header_line({
      line: `+++ ${from_path}`,
      is_single_root: params.is_single_root
    })
    content_str = content_str.replace(
      normalized_to_path_line,
      normalized_from_path_line
    )
  }

  const { workspace_name, relative_path } = extract_workspace_and_path({
    raw_file_path: file_path,
    is_single_root_folder_workspace: params.is_single_root
  })

  const patch: Diff = {
    type: 'diff',
    file_path: relative_path,
    workspace_name,
    content: content_str.endsWith('\n') ? content_str : content_str + '\n'
  }

  if (is_rename && to_path) {
    const { workspace_name: new_workspace, relative_path: new_relative } =
      extract_workspace_and_path({
        raw_file_path: to_path,
        is_single_root_folder_workspace: params.is_single_root
      })
    patch.new_file_path = new_relative
    if (new_workspace && new_workspace !== workspace_name) {
      patch.workspace_name = new_workspace
    }
  }

  return patch
}

const convert_code_block_to_new_file_diff = (params: {
  lines: string[]
  is_single_root: boolean
  file_path_hint?: string
}): Diff | null => {
  if (params.lines.length == 0 && !params.file_path_hint) {
    return null
  }

  // Regex to find file path. It can be commented or not.
  // It handles paths with slashes, backslashes, dots, alphanumerics, underscores, and hyphens.
  const path_regex = /(?:(?:\/\/|#|--|<!--)\s*)?([\w./\\-]+)/
  const xml_path_regex = /<(\w+)\s+path=["']([^"']+)["']/

  let file_path: string | undefined = params.file_path_hint
  let path_line_index = -1
  let content_lines: string[] = []

  // Check for XML path format
  const first_line = params.lines.length > 0 ? params.lines[0].trim() : ''
  const xml_match = first_line.match(xml_path_regex)

  if (xml_match && xml_match[1] && xml_match[2]) {
    const xml_tag_name = xml_match[1]
    const potential_path = normalize_path(xml_match[2])
    if (potential_path.endsWith('/')) {
      // This is a directory, not a file.
      return null
    }
    file_path = potential_path

    const file_tag_start = params.lines.findIndex((l) =>
      l.trim().startsWith(`<${xml_tag_name}`)
    )
    let file_tag_end = -1
    for (let i = params.lines.length - 1; i >= 0; i--) {
      if (params.lines[i].trim().startsWith(`</${xml_tag_name}>`)) {
        file_tag_end = i
        break
      }
    }

    if (
      file_tag_start != -1 &&
      file_tag_end != -1 &&
      file_tag_end > file_tag_start
    ) {
      const inner_lines = params.lines.slice(file_tag_start + 1, file_tag_end)

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

      if (cdata_start != -1 && cdata_end != -1 && cdata_end > cdata_start) {
        content_lines = inner_lines.slice(cdata_start + 1, cdata_end)
      } else {
        content_lines = inner_lines
      }
    } else {
      // malformed, maybe path is on first line, and content follows
      content_lines = params.lines.slice(1)
    }
  } else {
    // Look for a file path in the first few lines of the code block
    for (let i = 0; i < Math.min(params.lines.length, 5); i++) {
      const line = params.lines[i].trim()
      const match = line.match(path_regex)

      if (match && match[1]) {
        const potential_path = match[1]

        if (is_valid_file_path(potential_path)) {
          const rest_of_line = line
            .substring(line.indexOf(potential_path) + potential_path.length)
            .trim()
          // e.g. `25:5` for line and column, or `-->` for html comments
          const is_just_path_and_location = /^(?:\d+:\d+)?\s*(-->)?\s*$/.test(
            rest_of_line
          )

          if (is_just_path_and_location) {
            file_path = normalize_path(potential_path)
            path_line_index = i
            break // Found it, stop searching.
          }
        }
      }
    }
  }

  if (!file_path) {
    file_path = params.file_path_hint
  }

  if (path_line_index != -1) {
    content_lines = params.lines.filter((_, index) => index != path_line_index)
  } else if (file_path && content_lines.length == 0) {
    content_lines = params.lines
  }

  if (!file_path) {
    return null
  }

  const first_real_content_line = content_lines.find((l) => l.trim() != '')
  if (
    first_real_content_line &&
    first_real_content_line
      .trim()
      .match(/^(@@ -\d+(?:,\d+)? \+\d+(?:,\d+)? @@)/)
  ) {
    const { workspace_name, relative_path } = extract_workspace_and_path({
      raw_file_path: file_path,
      is_single_root_folder_workspace: params.is_single_root
    })
    const patch_content = [
      `--- a/${relative_path}`,
      `+++ b/${relative_path}`,
      ...content_lines
    ].join('\n')

    return {
      type: 'diff',
      file_path: relative_path,
      workspace_name,
      content: patch_content + '\n'
    }
  }

  const { workspace_name, relative_path } = extract_workspace_and_path({
    raw_file_path: file_path,
    is_single_root_folder_workspace: params.is_single_root
  })

  const patch_lines = content_lines.map((line) => `+${line}`)
  const patch_content = [
    `--- /dev/null`,
    `+++ b/${relative_path}`,
    `@@ -0,0 +1,${content_lines.length} @@`,
    ...patch_lines
  ].join('\n')

  return {
    type: 'diff',
    file_path: relative_path,
    workspace_name,
    content: patch_content + '\n'
  }
}

const extract_all_code_block_patches = (params: {
  normalized_text: string
  is_single_root: boolean
}): DiffOrTextBlock[] => {
  const items: DiffOrTextBlock[] = []
  const lines = params.normalized_text.split('\n')

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

  // First, identify all files that have explicit diff blocks.
  const files_with_diffs = new Set<string>()
  const diff_block_patches = new Map<number, Diff[]>()

  for (let i = 0; i < code_blocks.length; i++) {
    const block = code_blocks[i]
    if (block.type == 'diff' || block.type == 'patch') {
      let file_path_hint: string | undefined
      let is_new_file_from_hint = false
      if (i > 0) {
        const prev_block_lines = lines.slice(
          code_blocks[i - 1].start + 1,
          code_blocks[i - 1].end
        )
        const xml_path_regex = /<file\s+path=["']([^"']+)["']([^>]*)>/
        const non_empty_lines = prev_block_lines.filter((l) => l.trim() != '')
        if (non_empty_lines.length === 1) {
          const match = non_empty_lines[0].match(xml_path_regex)
          if (match && match[1]) {
            file_path_hint = match[1]
            const attributes = match[2] || ''
            if (/\snew\b/.test(attributes)) {
              is_new_file_from_hint = true
            }
          }
        }
      }

      if (!file_path_hint) {
        const hint_result = find_file_path_before_block({
          lines,
          block_start: block.start,
          is_single_root: params.is_single_root
        })
        file_path_hint = hint_result.file_path
      }

      const block_lines = lines.slice(block.start + 1, block.end)
      if (file_path_hint) {
        const { from_path, to_path } = extract_paths_from_lines(block_lines)
        if (!from_path && !to_path) {
          block_lines.unshift(
            is_new_file_from_hint ? '--- /dev/null' : `--- a/${file_path_hint}`,
            `+++ b/${file_path_hint}`
          )
        }
      }
      const parsed_patches = parse_multiple_raw_patches({
        all_lines: block_lines,
        is_single_root: params.is_single_root
      })
      if (parsed_patches.length > 0) {
        diff_block_patches.set(block.start, parsed_patches)
        for (const p of parsed_patches) {
          const file_key = `${p.workspace_name || ''}:${p.file_path}`
          files_with_diffs.add(file_key)
        }
      }
    }
  }

  let last_block_end = -1

  // Process each found code block in order of appearance.
  for (let i = 0; i < code_blocks.length; i++) {
    const block = code_blocks[i]
    const block_lines = lines.slice(block.start + 1, block.end)

    if (block.type != 'diff' && block.type != 'patch') {
      const has_truncation_comment = block_lines.some((line) => {
        const trimmed = line.trim()
        return (
          trimmed.startsWith('// ...') ||
          trimmed.startsWith('# ...') ||
          trimmed.startsWith('/* ...') ||
          trimmed.startsWith('* ...') ||
          trimmed.startsWith('-- ...') ||
          trimmed.startsWith('<!-- ...')
        )
      })
      if (has_truncation_comment) {
        continue
      }
    }

    const text_before = lines.slice(last_block_end + 1, block.start).join('\n')
    if (text_before.trim()) {
      items.push({ type: 'text', content: text_before.trim() })
    }

    if (block.type == 'diff' || block.type == 'patch') {
      const patches = diff_block_patches.get(block.start) || []
      if (patches.length > 0) {
        const last_item = items.length > 0 ? items[items.length - 1] : undefined
        if (last_item && last_item.type == 'text') {
          remove_path_line_from_text_block({
            text_item: last_item,
            target_file_path: patches[0].file_path,
            is_single_root: params.is_single_root
          })

          if (!last_item.content) {
            items.pop()
          }
        }
      }
      items.push(...patches)
    } else {
      // Check if this block was a hint for the next block.
      if (i < code_blocks.length - 1) {
        const next_block = code_blocks[i + 1]
        if (next_block.type === 'diff' || next_block.type === 'patch') {
          const xml_path_regex = /<file\s+path=["']([^"']+)["']/
          const non_empty_lines = block_lines.filter((l) => l.trim() !== '')
          if (non_empty_lines.length === 1) {
            const match = non_empty_lines[0].match(xml_path_regex)
            if (match && match[1]) {
              // This was a hint for the next block, so we should skip processing it as a file content block.
              last_block_end = block.end
              continue
            }
          }
        }
      }

      // Check if there's a comment line before the code block with a file path
      const hint_result = find_file_path_before_block({
        lines,
        block_start: block.start,
        is_single_root: params.is_single_root
      })

      const patch = convert_code_block_to_new_file_diff({
        lines: block_lines,
        is_single_root: params.is_single_root,
        file_path_hint: hint_result.file_path
      })

      if (patch) {
        const last_item = items.length > 0 ? items[items.length - 1] : undefined
        if (last_item && last_item.type == 'text') {
          const content_lines = last_item.content.split('\n')
          let last_non_empty_line_index = -1
          let last_non_empty_line = ''
          for (let i = content_lines.length - 1; i >= 0; i--) {
            if (content_lines[i].trim() !== '') {
              last_non_empty_line_index = i
              last_non_empty_line = content_lines[i].trim()
              break
            }
          }

          if (last_non_empty_line) {
            const extracted =
              extract_path_with_xml_fallback(last_non_empty_line)

            if (extracted) {
              const { relative_path } = extract_workspace_and_path({
                raw_file_path: extracted,
                is_single_root_folder_workspace: params.is_single_root
              })
              if (relative_path === patch.file_path) {
                const new_content = content_lines
                  .slice(0, last_non_empty_line_index)
                  .join('\n')
                  .trim()

                if (new_content) {
                  last_item.content = new_content
                } else {
                  items.pop()
                }
              }
            }
          }
        }

        const file_key = `${patch.workspace_name || ''}:${patch.file_path}`

        if (!files_with_diffs.has(file_key)) {
          if (hint_result.workspace_name && !patch.workspace_name) {
            patch.workspace_name = hint_result.workspace_name
          }
          items.push(patch)
        }
      } else {
        const block_content = lines.slice(block.start, block.end + 1).join('\n')
        if (block_lines.join('').trim()) {
          items.push({ type: 'text', content: block_content })
        }
      }
    }
    last_block_end = block.end
  }

  if (last_block_end < lines.length - 1) {
    const text_after = lines.slice(last_block_end + 1).join('\n')
    if (text_after.trim()) {
      items.push({ type: 'text', content: text_after.trim() })
    }
  }

  return items
}

const parse_multiple_raw_patches = (params: {
  all_lines: string[]
  is_single_root: boolean
}): Diff[] => {
  const patches: Diff[] = []
  let current_patch_lines: string[] = []

  for (const line of params.all_lines) {
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
          const patch_info = process_collected_patch_lines({
            patch_lines_array: current_patch_lines,
            is_single_root: params.is_single_root
          })
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
    const patch_info = process_collected_patch_lines({
      patch_lines_array: current_patch_lines,
      is_single_root: params.is_single_root
    })
    if (patch_info) {
      patches.push(patch_info)
    }
  }

  return patches
}

export const extract_diffs = (params: {
  clipboard_text: string
  is_single_root: boolean
}): DiffOrTextBlock[] => {
  const normalized_text = params.clipboard_text.replace(/\r\n/g, '\n')
  const lines = normalized_text.split('\n')

  const code_block_regex = /^```(\w*)/
  const uses_code_blocks = lines.some((line) =>
    code_block_regex.test(line.trim())
  )

  if (uses_code_blocks) {
    return extract_all_code_block_patches({
      normalized_text,
      is_single_root: params.is_single_root
    })
  } else {
    return parse_multiple_raw_patches({
      all_lines: lines,
      is_single_root: params.is_single_root
    })
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

const build_patch_content = (params: {
  lines: string[]
  file_path: string
  patch_start_index: number
  is_single_root: boolean
}): string => {
  let patch_content: string

  if (params.patch_start_index >= 0) {
    let patch_lines = params.lines.slice(params.patch_start_index)

    const hunk_start_idx = patch_lines.findIndex((line) =>
      line.startsWith('@@')
    )

    if (hunk_start_idx >= 0) {
      const header_lines = patch_lines.slice(0, hunk_start_idx)
      const body_lines = patch_lines.slice(hunk_start_idx)
      const formatted_body_lines = format_hunk_headers(body_lines)

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

      patch_lines = [...final_header, ...formatted_body_lines]
    }

    patch_content = patch_lines
      .map((line) => {
        if (line.startsWith('--- ') || line.startsWith('+++ ')) {
          return normalize_header_line({
            line,
            is_single_root: params.is_single_root
          })
        }
        return line
      })
      .join('\n')
  } else {
    const content_start_index = params.lines.findIndex((line) =>
      line.startsWith('@@')
    )

    if (content_start_index == -1) {
      Logger.info({
        function_name: 'build_patch_content',
        message:
          'No @@ content found, constructing minimal patch headers based on file_path.',
        data: { file_path: params.file_path }
      })
      const relative_file_path =
        params.is_single_root === false
          ? extract_workspace_and_path({
              raw_file_path: params.file_path,
              is_single_root_folder_workspace: false
            }).relative_path
          : params.file_path
      patch_content = `--- a/${relative_file_path}\n+++ b/${relative_file_path}`
    } else {
      const patch_body_lines = params.lines.slice(content_start_index)
      const formatted_patch_body_lines = format_hunk_headers(patch_body_lines)
      const relative_file_path =
        params.is_single_root === false
          ? extract_workspace_and_path({
              raw_file_path: params.file_path,
              is_single_root_folder_workspace: params.is_single_root
            }).relative_path
          : params.file_path
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
