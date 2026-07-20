export type Segment =
  | { type: 'common'; lines: string[] }
  | { type: 'conflict'; original_lines: string[]; updated_lines: string[] }

export const parse_conflict_segments = (content: string): Segment[] => {
  const lines = content.replace(/\r\n/g, '\n').split('\n')
  const segments: Segment[] = []
  let current_lines: string[] = []

  let state: 'NORMAL' | 'ORIGINAL' | 'UPDATED' = 'NORMAL'

  let original_buffer: string[] = []
  let updated_buffer: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('<<<<<<<')) {
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

    if (trimmed.startsWith('=======')) {
      if (state == 'ORIGINAL') {
        state = 'UPDATED'
      } else if (state == 'NORMAL') {
        current_lines.push(line)
      } else {
        updated_buffer.push(line)
      }
      continue
    }

    if (trimmed.startsWith('>>>>>>>')) {
      if (state == 'UPDATED' || state == 'ORIGINAL') {
        segments.push({
          type: 'conflict',
          original_lines: original_buffer,
          updated_lines: state == 'UPDATED' ? updated_buffer : []
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

  if (current_lines.length > 0) {
    segments.push({ type: 'common', lines: current_lines })
  }

  return segments
}
