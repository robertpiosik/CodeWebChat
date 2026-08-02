import { find_line_sequence } from './utils/find-line-sequence'
import { is_truncation_line } from './utils/is-truncation-line'

export const process_truncations = (
  new_text: string,
  original_text: string
): string => {
  const new_lines = new_text.split(/\r?\n/)
  const original_lines = original_text.split(/\r?\n/)

  const blocks: { type: 'code' | 'truncation'; lines: string[] }[] = []
  let buffer: string[] = []

  for (const line of new_lines) {
    if (is_truncation_line(line)) {
      if (buffer.length > 0) {
        blocks.push({ type: 'code', lines: buffer })
        buffer = []
      }
      blocks.push({ type: 'truncation', lines: [line] })
    } else {
      buffer.push(line)
    }
  }
  if (buffer.length > 0) {
    blocks.push({ type: 'code', lines: buffer })
  }

  const output_lines: string[] = []
  let current_original_idx = 0 // Line index in original

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]

    if (block.type == 'code') {
      output_lines.push(...block.lines)

      const search_window_size = 10
      const suffix_lines = block.lines.slice(-search_window_size)

      let found_match = false
      let match_end_idx = -1

      for (let len = suffix_lines.length; len >= 1; len--) {
        const sub_suffix = suffix_lines.slice(suffix_lines.length - len)
        const idx = find_line_sequence({
          lines: original_lines,
          sequence: sub_suffix,
          start_idx: current_original_idx
        })
        if (idx !== -1) {
          found_match = true
          match_end_idx = idx + len
          break
        }
      }

      if (found_match) {
        current_original_idx = match_end_idx
      }
    } else {
      let fill_end_idx = original_lines.length

      if (i + 1 < blocks.length) {
        const next_block = blocks[i + 1]
        if (next_block.type === 'code') {
          const prefix_lines = next_block.lines.slice(0, 10)
          let found_next = false

          for (let len = prefix_lines.length; len >= 1; len--) {
            const sub_prefix = prefix_lines.slice(0, len)
            const idx = find_line_sequence({
              lines: original_lines,
              sequence: sub_prefix,
              start_idx: current_original_idx
            })
            if (idx !== -1) {
              fill_end_idx = idx
              found_next = true
              break
            }
          }

          if (!found_next) {
            fill_end_idx = original_lines.length
          }
        }
      }

      if (fill_end_idx > current_original_idx) {
        output_lines.push(
          ...original_lines.slice(current_original_idx, fill_end_idx)
        )
      }
      current_original_idx = fill_end_idx
    }
  }

  const result = output_lines.join('\n')

  if (original_text.endsWith('\n') && !result.endsWith('\n')) {
    return result + '\n'
  }

  return result
}
