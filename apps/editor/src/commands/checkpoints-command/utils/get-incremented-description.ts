import type { Checkpoint } from '../types'

export const get_incremented_description = (
  title: string,
  description: string | undefined,
  checkpoints: Checkpoint[]
): string | undefined => {
  if (checkpoints.length == 0) {
    return description
  }

  const most_recent = checkpoints[0]

  if (most_recent.title != title) {
    return description
  }

  const most_recent_desc = most_recent.description || ''
  const normalized_desc = description || ''

  const counter_pattern = /^(.*?)\s*\((\d+)\)$/
  const match = most_recent_desc.match(counter_pattern)

  let base_desc: string
  let counter: number

  if (match) {
    base_desc = match[1].trim()
    counter = parseInt(match[2], 10)
  } else {
    base_desc = most_recent_desc
    counter = 0
  }

  const current_matches = normalized_desc === base_desc

  if (current_matches) {
    const next_counter = counter + 1
    if (normalized_desc == '') {
      return `(${next_counter})`
    }
    return `(${next_counter}) ${normalized_desc}`
  }

  return description
}
