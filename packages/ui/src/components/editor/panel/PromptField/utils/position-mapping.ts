export const map_display_pos_to_raw_pos = (
  display_pos: number,
  raw_text: string,
  context_file_paths: string[]
): number => {
  let raw_pos = 0
  let current_display_pos = 0
  let last_raw_index = 0

  const regex =
    /`([^\s`]*\.[^\s`]+)`|(#Changes:[^\s,;:!?]+)|(#Selection)|(#SavedContext:(?:WorkspaceState|JSON)\s+"([^"]+)")|(#(?:Commit|ContextAtCommit):[^:]+:([^\s"]+)\s+"[^"]*")/g
  let match

  while ((match = regex.exec(raw_text)) !== null) {
    const file_path = match[1]
    const changes_keyword = match[2]
    const selection_keyword = match[3]
    const saved_context_keyword = match[4]
    const context_name = match[5]
    const commit_keyword = match[6]
    const commit_hash = match[7]

    let is_replacement_match = false
    let display_match_length = 0

    if (file_path && context_file_paths.includes(file_path)) {
      const filename = file_path.split('/').pop() || file_path
      display_match_length = filename.length
      is_replacement_match = true
    } else if (changes_keyword) {
      const branch_name = changes_keyword.substring('#Changes:'.length)
      display_match_length = `Diff with ${branch_name}`.length
      is_replacement_match = true
    } else if (selection_keyword) {
      display_match_length = 'Selection'.length
      is_replacement_match = true
    } else if (saved_context_keyword) {
      display_match_length = `Context "${context_name}"`.length
      is_replacement_match = true
    } else if (commit_keyword) {
      const short_hash = commit_hash.substring(0, 7)
      display_match_length = short_hash.length
      is_replacement_match = true
    }

    if (!is_replacement_match) {
      continue
    }

    const raw_match_length = match[0].length
    const text_before_length = match.index - last_raw_index

    if (display_pos <= current_display_pos + text_before_length) {
      return raw_pos + (display_pos - current_display_pos)
    }

    current_display_pos += text_before_length
    raw_pos += text_before_length

    if (display_pos <= current_display_pos + display_match_length) {
      const pos_in_display = display_pos - current_display_pos
      if (pos_in_display < display_match_length) {
        return raw_pos
      } else {
        return raw_pos + raw_match_length
      }
    }

    current_display_pos += display_match_length
    raw_pos += raw_match_length
    last_raw_index = regex.lastIndex
  }

  // Cursor is in the text after all matches
  return raw_pos + (display_pos - current_display_pos)
}

export const map_raw_pos_to_display_pos = (
  raw_pos: number,
  raw_text: string,
  context_file_paths: string[]
): number => {
  let display_pos = 0
  let current_raw_pos = 0
  let last_raw_index = 0

  const regex =
    /`([^\s`]*\.[^\s`]+)`|(#Changes:[^\s,;:!?]+)|(#Selection)|(#SavedContext:(?:WorkspaceState|JSON)\s+"([^"]+)")|(#(?:Commit|ContextAtCommit):[^:]+:([^\s"]+)\s+"[^"]*")/g
  let match

  while ((match = regex.exec(raw_text)) !== null) {
    const file_path = match[1]
    const changes_keyword = match[2]
    const selection_keyword = match[3]
    const saved_context_keyword = match[4]
    const context_name = match[5]
    const commit_keyword = match[6]
    const commit_hash = match[7]

    let is_replacement_match = false
    let display_match_length = 0

    if (file_path && context_file_paths.includes(file_path)) {
      const filename = file_path.split('/').pop() || file_path
      display_match_length = filename.length
      is_replacement_match = true
    } else if (changes_keyword) {
      const branch_name = changes_keyword.substring('#Changes:'.length)
      display_match_length = `Diff with ${branch_name}`.length
      is_replacement_match = true
    } else if (selection_keyword) {
      display_match_length = 'Selection'.length
      is_replacement_match = true
    } else if (saved_context_keyword) {
      display_match_length = `Context "${context_name}"`.length
      is_replacement_match = true
    } else if (commit_keyword) {
      const short_hash = commit_hash.substring(0, 7)
      display_match_length = short_hash.length
      is_replacement_match = true
    }

    if (!is_replacement_match) {
      continue
    }

    const raw_match_length = match[0].length
    const text_before_length = match.index - last_raw_index
    if (raw_pos <= current_raw_pos + text_before_length) {
      return display_pos + (raw_pos - current_raw_pos)
    }
    current_raw_pos += text_before_length
    display_pos += text_before_length
    if (raw_pos <= current_raw_pos + raw_match_length) {
      return display_pos + display_match_length
    }
    current_raw_pos += raw_match_length
    display_pos += display_match_length
    last_raw_index = regex.lastIndex
  }
  return display_pos + (raw_pos - current_raw_pos)
}
