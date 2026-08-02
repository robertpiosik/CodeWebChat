export const find_line_sequence = (params: {
  lines: string[]
  sequence: string[]
  start_idx: number
}): number => {
  if (params.sequence.length == 0) return -1
  if (params.start_idx >= params.lines.length) return -1

  for (
    let i = params.start_idx;
    i <= params.lines.length - params.sequence.length;
    i++
  ) {
    let match = true
    for (let j = 0; j < params.sequence.length; j++) {
      if (params.lines[i + j] !== params.sequence[j]) {
        match = false
        break
      }
    }
    if (match) return i
  }

  for (
    let i = params.start_idx;
    i <= params.lines.length - params.sequence.length;
    i++
  ) {
    let match = true
    for (let j = 0; j < params.sequence.length; j++) {
      if (params.lines[i + j].trim() !== params.sequence[j].trim()) {
        match = false
        break
      }
    }
    if (match) return i
  }
  return -1
}
