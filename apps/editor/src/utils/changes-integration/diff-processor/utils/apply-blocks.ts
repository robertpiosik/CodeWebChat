import { SearchBlock } from '../types'

export const apply_blocks = (params: {
  valid_blocks: SearchBlock[]
  original_code_lines: string[]
}): string => {
  const result_lines = [...params.original_code_lines]

  for (const block of params.valid_blocks) {
    const start_index =
      block.search_block_start_index == -1 ? 0 : block.search_block_start_index
    const replacement_content: string[] = []
    let last_original_idx = start_index - 1

    const matched_original_indices = new Set(
      block.search_to_original_map.values()
    )

    const search_count =
      block.actual_original_line_count || block.search_lines.length
    const end_original_idx = start_index + search_count - 1

    for (let i = 0; i < block.replace_lines.length; i++) {
      const line = block.replace_lines[i]
      const is_last_replace_line = i === block.replace_lines.length - 1

      if (line.search_index != null) {
        const original_idx = block.search_to_original_map.get(line.search_index)
        if (original_idx != undefined) {
          for (let skip = last_original_idx + 1; skip < original_idx; skip++) {
            if (!matched_original_indices.has(skip)) {
              replacement_content.push(params.original_code_lines[skip])
            }
          }
          let content = params.original_code_lines[original_idx]
          if (
            !content.endsWith('\n') &&
            (original_idx < params.original_code_lines.length - 1 ||
              !is_last_replace_line)
          ) {
            content += '\n'
          }
          replacement_content.push(content)
          last_original_idx = original_idx
        }
      } else {
        let target_original_idx = last_original_idx
        if (
          line.insert_after_search_index != null &&
          line.insert_after_search_index >= 0
        ) {
          const mapped_idx = block.search_to_original_map.get(
            line.insert_after_search_index
          )
          if (mapped_idx != undefined) {
            target_original_idx = mapped_idx
          }
        }

        for (
          let skip = last_original_idx + 1;
          skip <= target_original_idx;
          skip++
        ) {
          if (!matched_original_indices.has(skip)) {
            replacement_content.push(params.original_code_lines[skip])
          }
        }
        if (target_original_idx > last_original_idx) {
          last_original_idx = target_original_idx
        }

        let content = line.content
        if (
          is_last_replace_line &&
          params.original_code_lines.length > 0 &&
          end_original_idx === params.original_code_lines.length - 1 &&
          !params.original_code_lines[
            params.original_code_lines.length - 1
          ].endsWith('\n')
        ) {
          content = content.replace(/\n$/, '')
        }
        replacement_content.push(content)
      }
    }

    for (let skip = last_original_idx + 1; skip <= end_original_idx; skip++) {
      if (!matched_original_indices.has(skip)) {
        replacement_content.push(params.original_code_lines[skip])
      }
    }

    if (start_index >= 0 && start_index <= result_lines.length) {
      result_lines.splice(start_index, search_count, ...replacement_content)
    }
  }

  return result_lines.join('')
}
