import { diffLines } from 'diff'

export const get_diff_stats = (params: {
  original_content: string
  new_content: string
}): { lines_added: number; lines_removed: number } => {
  const original_content_processed = params.original_content.replace(
    /\r\n/g,
    '\n'
  )
  const new_content_processed = params.new_content.replace(/\r\n/g, '\n')

  if (original_content_processed == new_content_processed) {
    return { lines_added: 0, lines_removed: 0 }
  }

  const changes = diffLines(original_content_processed, new_content_processed)

  let lines_added = 0
  let lines_removed = 0

  for (const change of changes) {
    if (change.added) {
      lines_added += change.count || 0
    } else if (change.removed) {
      lines_removed += change.count || 0
    }
  }

  return { lines_added, lines_removed }
}
