import { createTwoFilesPatch } from 'diff'

export const get_diff_stats = (params: {
  original_content: string
  new_content: string
}): { lines_added: number; lines_removed: number } => {
  const original_content_processed = params.original_content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .join('\n')
  const new_content_processed = params.new_content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .join('\n')
  if (original_content_processed === new_content_processed) {
    return { lines_added: 0, lines_removed: 0 }
  }

  const patch = createTwoFilesPatch(
    'original',
    'modified',
    original_content_processed,
    new_content_processed,
    undefined,
    undefined,
    { context: 0 }
  )

  let lines_added = 0
  let lines_removed = 0

  const lines = patch.split('\n')
  for (const line of lines) {
    if (line.startsWith('+') && !line.startsWith('+++')) {
      lines_added++
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      lines_removed++
    }
  }

  return { lines_added, lines_removed }
}
