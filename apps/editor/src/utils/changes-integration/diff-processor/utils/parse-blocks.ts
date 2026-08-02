import { ReplaceLine, SearchBlock } from '../types'

export const parse_patch_blocks = (params: {
  patch_lines_normalized: string[]
  patch_lines_original: string[]
}): SearchBlock[] => {
  const search_replace_blocks: SearchBlock[] = []
  let search_chunks: string[] = []
  let replace_chunks: ReplaceLine[] = []
  let after_search_chunks: string[] = []

  let inside_replace_block = false
  let current_block_has_changes = false
  let current_search_index_tracker = -1

  const push_block = () => {
    while (
      search_chunks.length > 0 &&
      search_chunks[search_chunks.length - 1] == '~nnn' &&
      replace_chunks.length > 0 &&
      replace_chunks[replace_chunks.length - 1].search_index ===
        search_chunks.length - 1
    ) {
      search_chunks.pop()
      replace_chunks.pop()
      if (
        after_search_chunks.length > 0 &&
        after_search_chunks[after_search_chunks.length - 1] == '~nnn'
      ) {
        after_search_chunks.pop()
      }
    }

    if (search_chunks.length > 0 || replace_chunks.length > 0) {
      if (current_block_has_changes) {
        search_replace_blocks.push({
          search_lines: search_chunks,
          replace_lines: replace_chunks,
          after_search_lines: after_search_chunks,
          search_block_start_index: -1,
          actual_original_line_count: 0,
          search_to_original_map: new Map()
        })
      }
    }
    search_chunks = []
    replace_chunks = []
    after_search_chunks = []
    inside_replace_block = false
    current_block_has_changes = false
    current_search_index_tracker = -1
  }

  for (let i = 0; i < params.patch_lines_normalized.length; i++) {
    const line = params.patch_lines_normalized[i]
    const line_original = params.patch_lines_original[i]

    if (line.startsWith('@@')) {
      push_block()
      continue
    }

    if (line.startsWith('-') || line.startsWith('~')) {
      if (inside_replace_block && line.startsWith('-')) {
        push_block()
      }

      inside_replace_block = false

      if (line.startsWith('-')) {
        current_block_has_changes = true
      }

      if (line.startsWith('~nnn') || line.startsWith('-~nnn')) {
        search_chunks.push('~nnn')
      } else {
        search_chunks.push(line.replace(/^-/, '').replace(/^~/, ''))
      }

      current_search_index_tracker = search_chunks.length - 1

      if (!line.startsWith('-')) {
        if (line.startsWith('~nnn')) {
          after_search_chunks.push('~nnn')
        } else {
          after_search_chunks.push(line.replace(/^~/, ''))
        }
      }

      if (line.startsWith('~nnn')) {
        replace_chunks.push({
          content: line_original.replace(/^~nnn/, '') + '\n',
          search_index: search_chunks.length - 1,
          insert_after_search_index: current_search_index_tracker
        })
      } else if (line.startsWith('~')) {
        replace_chunks.push({
          content: line_original + '\n',
          search_index: search_chunks.length - 1,
          insert_after_search_index: current_search_index_tracker
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
          search_index: null,
          insert_after_search_index: current_search_index_tracker
        })
        after_search_chunks.push('~nnn')
      } else {
        replace_chunks.push({
          content: line_original.replace(/^\+/, '') + '\n',
          search_index: null,
          insert_after_search_index: current_search_index_tracker
        })
        after_search_chunks.push(line.replace(/^\+/, ''))
      }
    }
  }

  push_block()

  return search_replace_blocks
}
