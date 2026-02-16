export type Segment =
  | { type: 'common'; lines: string[] }
  | { type: 'conflict'; original_lines: string[]; updated_lines: string[] }

export const parse_conflict_segments = (content: string): Segment[] => {
  const lines = content.split('\n')
  const segments: Segment[] = []
  let current_lines: string[] = []

  let state: 'NORMAL' | 'ORIGINAL' | 'UPDATED' = 'NORMAL'

  let original_buffer: string[] = []
  let updated_buffer: string[] = []

  for (const line of lines) {
    if (line.trim().startsWith('<<<<<<<')) {
      if (state == 'NORMAL') {
        if (current_lines.length > 0) {
          segments.push({ type: 'common', lines: [...current_lines] })
          current_lines = []
        }
        state = 'ORIGINAL'
        original_buffer = []
        updated_buffer = []
      } else {
        if (state == 'ORIGINAL') original_buffer.push(line)
        if (state == 'UPDATED') updated_buffer.push(line)
      }
      continue
    }

    if (line.trim().startsWith('=======')) {
      if (state == 'ORIGINAL') {
        state = 'UPDATED'
      } else if (state == 'NORMAL') {
        current_lines.push(line)
      } else {
        updated_buffer.push(line)
      }
      continue
    }

    if (line.trim().startsWith('>>>>>>>')) {
      if (state == 'UPDATED') {
        segments.push({
          type: 'conflict',
          original_lines: original_buffer,
          updated_lines: updated_buffer
        })
        state = 'NORMAL'
        original_buffer = []
        updated_buffer = []
      } else if (state == 'ORIGINAL') {
        segments.push({
          type: 'conflict',
          original_lines: original_buffer,
          updated_lines: []
        })
        state = 'NORMAL'
        original_buffer = []
        updated_buffer = []
      } else {
        current_lines.push(line)
      }
      continue
    }

    if (state == 'NORMAL') {
      current_lines.push(line)
    } else if (state == 'ORIGINAL') {
      original_buffer.push(line)
    } else if (state == 'UPDATED') {
      updated_buffer.push(line)
    }
  }

  if (state == 'NORMAL' && current_lines.length > 0) {
    segments.push({ type: 'common', lines: current_lines })
  }

  return segments
}

export const apply_conflict_markers_to_content = (
  original_content: string,
  markers_content: string
): string => {
  let current_content = original_content
  const segments = parse_conflict_segments(markers_content)
  let cursor = 0

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    if (segment.type == 'conflict') {
      const prev = i > 0 ? segments[i - 1] : undefined
      const next = i < segments.length - 1 ? segments[i + 1] : undefined

      const context_before = prev && prev.type == 'common' ? prev.lines : []
      const context_after = next && next.type == 'common' ? next.lines : []

      const search_lines = [
        ...context_before,
        ...segment.original_lines,
        ...context_after
      ]
      const search_text = search_lines.join('\n')

      const replace_lines = [
        ...context_before,
        ...segment.updated_lines,
        ...context_after
      ]
      const replace_text = replace_lines.join('\n')

      const index = current_content.indexOf(search_text, cursor)

      if (index == -1) {
        throw new Error(
          `Could not find content to replace for conflict marker. Context:\n${search_text.slice(
            0,
            100
          )}...`
        )
      }

      current_content =
        current_content.slice(0, index) +
        replace_text +
        current_content.slice(index + search_text.length)

      const unique_replaced_lines = [
        ...context_before,
        ...segment.updated_lines
      ]
      const unique_replaced_text = unique_replaced_lines.join('\n')

      let advance = unique_replaced_text.length
      if (context_after.length > 0 && unique_replaced_lines.length > 0) {
        advance += 1
      }

      cursor = index + advance
    }
  }
  return current_content
}
