import * as vscode from 'vscode'
import * as fs from 'fs'

type ReplaceLine = {
  content: string
  search_index: number | null
}

type SearchBlock = {
  search_lines: string[]
  replace_lines: ReplaceLine[]
  search_block_start_index: number
  actual_original_line_count: number
  search_to_original_map: Map<number, number>
}

export const process_diff = async (params: {
  file_path: string
  diff_patch_path: string
  use_strict_whitespace?: boolean
}): Promise<string> => {
  const file_content = fs.readFileSync(params.file_path, 'utf8')
  const diff_patch_content = fs.readFileSync(params.diff_patch_path, 'utf8')

  const result = apply_diff({
    original_code: file_content,
    diff_patch: diff_patch_content,
    use_strict_whitespace: params.use_strict_whitespace
  })

  try {
    await vscode.workspace.fs.writeFile(
      vscode.Uri.file(params.file_path),
      Buffer.from(result, 'utf8')
    )
    return result
  } catch (error) {
    throw new Error('Failed to save file after applying diff patch')
  }
}

export const apply_diff = (params: {
  original_code: string
  diff_patch: string
  use_strict_whitespace?: boolean
}): string => {
  const original_code_normalized = params.original_code.replace(/\r\n/g, '\n')
  const original_code_lines = original_code_normalized.split(/^/m)
  const original_code_lines_normalized: { key: number; value: string }[] = []

  const patch_normalized = params.diff_patch.replace(/\r\n/g, '\n')
  const patch_lines = patch_normalized.split('\n')
  const patch_lines_original: string[] = []
  const patch_lines_normalized: string[] = []

  let line_count = 0
  for (let i = 0; i < original_code_lines.length; i++) {
    let line = original_code_lines[i]

    if (line.trim() == '') {
      line = '~nnn'
    }

    const line_normalized = line
      .replace(/\r\n/g, '')
      .replace(/\r/g, '')
      .replace(/\n/g, '')

    let line_normalized_processed = line_normalized.replace(/\s+/g, '')

    if (params.use_strict_whitespace) {
      line_normalized_processed = line_normalized
    }

    original_code_lines_normalized.push({
      key: line_count,
      value: line_normalized_processed
    })

    line_count++
  }

  for (let i = 0; i < patch_lines.length; i++) {
    let line = patch_lines[i]

    if (
      line.startsWith('diff --git') ||
      line.startsWith('index') ||
      line.startsWith('---') ||
      line.startsWith('+++')
    ) {
      continue
    }

    if (line.trim() == '') {
      line = '~nnn'
    } else if (line.trim() == '+') {
      line = '+~nnn'
    } else if (line.trim() == '-') {
      line = '-~nnn'
    }

    patch_lines_original.push(
      line.startsWith(' ') ? line.substring(1, line.length) : line
    )

    let line_normalized = line
      .replace(/\r\n/g, '')
      .replace(/\r/g, '')
      .replace(/\n/g, '')

    let line_normalized_processed = ''

    if (params.use_strict_whitespace) {
      if (line_normalized.startsWith(' ')) {
        line_normalized_processed = '~' + line_normalized.substring(1)
      } else {
        line_normalized_processed = line_normalized
      }
    } else {
      if (line_normalized.startsWith(' ')) {
        line_normalized = line_normalized.replace(/^\s+/, '~')
      }
      line_normalized_processed = line_normalized.replace(/\s+/g, '')
    }

    patch_lines_normalized.push(line_normalized_processed)
  }

  const search_replace_blocks: SearchBlock[] = []
  let search_chunks: string[] = []
  let replace_chunks: ReplaceLine[] = []

  let inside_replace_block = false
  let current_block_has_changes = false

  const push_block = () => {
    if (search_chunks.length > 0 || replace_chunks.length > 0) {
      if (current_block_has_changes) {
        search_replace_blocks.push({
          search_lines: search_chunks,
          replace_lines: replace_chunks,
          search_block_start_index: -1,
          actual_original_line_count: 0,
          search_to_original_map: new Map()
        })
      }
    }
    search_chunks = []
    replace_chunks = []
    inside_replace_block = false
    current_block_has_changes = false
  }

  for (let i = 0; i < patch_lines_normalized.length; i++) {
    const line = patch_lines_normalized[i]
    const line_original = patch_lines_original[i]

    if (line.startsWith('@@')) {
      push_block()
      continue
    }

    if (line.startsWith('-') || line.startsWith('~')) {
      if (inside_replace_block) {
        push_block()
      }

      if (line.startsWith('-')) {
        current_block_has_changes = true
      }

      if (line.startsWith('~nnn') || line.startsWith('-~nnn')) {
        search_chunks.push('~nnn')
      } else {
        search_chunks.push(line.replace(/^-/, '').replace(/^~/, ''))
      }

      if (line.startsWith('~nnn')) {
        replace_chunks.push({
          content: line_original.replace(/^~nnn/, '') + '\n',
          search_index: search_chunks.length - 1
        })
      } else if (line.startsWith('~')) {
        replace_chunks.push({
          content: line_original + '\n',
          search_index: search_chunks.length - 1
        })
      }

      continue
    }

    if (line.startsWith('+')) {
      inside_replace_block = true
      current_block_has_changes = true

      if (line.startsWith('+~nnn')) {
        replace_chunks.push({
          content: line_original.replace(/^\+~nnn/, '') + '\n',
          search_index: null
        })
      } else {
        replace_chunks.push({
          content: line_original.replace(/^\+/, '') + '\n',
          search_index: null
        })
      }
    }
  }

  if (search_chunks.length > 0 || replace_chunks.length > 0) {
    if (
      search_chunks[search_chunks.length - 1] == '~nnn' &&
      !inside_replace_block
    ) {
      search_chunks.pop()
      replace_chunks.pop()
    }
    push_block()
  }

  let previous_found_index = 0
  for (let i = 0; i < search_replace_blocks.length; i++) {
    const block = search_replace_blocks[i]

    if (block.search_lines.length == 0 && previous_found_index == 0) {
      block.search_block_start_index = -1
      continue
    }

    const safe_trim_indices: number[] = []
    for (const replace_line of block.replace_lines) {
      if (replace_line.search_index === null) {
        break // Hit an insertion, cannot trim further
      }
      safe_trim_indices.push(replace_line.search_index)
    }

    let max_trim_top = 0
    for (let k = 0; k < safe_trim_indices.length; k++) {
      if (safe_trim_indices[k] === k) {
        max_trim_top = k + 1
      } else {
        break
      }
    }

    let found = false
    let matched_info: {
      start_index: number
      actual_count: number
      map: Map<number, number>
    } | null = null
    let used_trim_top = 0

    for (let trim_cnt = 0; trim_cnt <= max_trim_top; trim_cnt++) {
      const current_search_lines = block.search_lines.slice(trim_cnt)
      if (current_search_lines.length === 0) continue

      for (
        let j = previous_found_index;
        j < original_code_lines_normalized.length;
        j++
      ) {
        let search_ptr = 0
        let original_ptr = j
        const matched_indices: number[] = []
        const current_search_to_original = new Map<number, number>()

        while (
          search_ptr < current_search_lines.length &&
          original_ptr < original_code_lines_normalized.length
        ) {
          const s_val = current_search_lines[search_ptr]
          const o_val = original_code_lines_normalized[original_ptr].value

          if (s_val == o_val) {
            current_search_to_original.set(
              search_ptr + trim_cnt,
              original_code_lines_normalized[original_ptr].key
            )
            matched_indices.push(
              original_code_lines_normalized[original_ptr].key
            )
            search_ptr++
            original_ptr++
          } else if (o_val == '~nnn') {
            matched_indices.push(
              original_code_lines_normalized[original_ptr].key
            )
            original_ptr++
          } else if (s_val == '~nnn') {
            search_ptr++
          } else {
            break
          }
        }

        if (search_ptr == current_search_lines.length) {
          matched_info = {
            start_index: matched_indices[0],
            actual_count: matched_indices.length,
            map: current_search_to_original
          }
          found = true
          break
        }
      }

      if (found) {
        used_trim_top = trim_cnt
        break
      }
    }

    if (found && matched_info) {
      block.search_block_start_index = matched_info.start_index
      block.actual_original_line_count = matched_info.actual_count
      block.search_to_original_map = matched_info.map

      if (used_trim_top > 0) {
        block.search_lines = block.search_lines.slice(used_trim_top)
        block.replace_lines = block.replace_lines.filter(
          (l) => l.search_index === null || l.search_index >= used_trim_top
        )
      }

      const indices = Array.from(matched_info.map.values())
      previous_found_index = Math.max(...indices) + 1
    } else {
      block.search_block_start_index = -2
    }
  }

  const valid_blocks = search_replace_blocks.filter(
    (block) => block.search_block_start_index != -2
  )
  valid_blocks.sort(
    (a, b) => b.search_block_start_index - a.search_block_start_index
  )

  const result_lines = [...original_code_lines]

  for (const block of valid_blocks) {
    const start_index =
      block.search_block_start_index == -1 ? 0 : block.search_block_start_index
    const replacement_content: string[] = []
    let last_original_idx = start_index - 1

    const matched_original_indices = new Set(
      block.search_to_original_map.values()
    )

    for (const line of block.replace_lines) {
      if (line.search_index != null) {
        const original_idx = block.search_to_original_map.get(line.search_index)
        if (original_idx != undefined) {
          for (let skip = last_original_idx + 1; skip < original_idx; skip++) {
            if (
              original_code_lines_normalized[skip].value == '~nnn' &&
              !matched_original_indices.has(skip)
            ) {
              replacement_content.push(original_code_lines[skip])
            }
          }
          let content = original_code_lines[original_idx]
          if (
            !content.endsWith('\n') &&
            original_idx < original_code_lines.length - 1
          ) {
            content += '\n'
          }
          replacement_content.push(content)
          last_original_idx = original_idx
        }
      } else {
        replacement_content.push(line.content)
      }
    }

    const search_count =
      block.actual_original_line_count || block.search_lines.length
    const end_original_idx = start_index + search_count - 1
    for (let skip = last_original_idx + 1; skip <= end_original_idx; skip++) {
      if (
        original_code_lines_normalized[skip].value == '~nnn' &&
        !matched_original_indices.has(skip)
      ) {
        replacement_content.push(original_code_lines[skip])
      }
    }

    if (start_index >= 0 && start_index <= result_lines.length) {
      result_lines.splice(start_index, search_count, ...replacement_content)
    }
  }

  return result_lines.join('')
}
