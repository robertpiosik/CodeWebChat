export const map_display_pos_to_raw_pos = (params: {
  display_pos: number
  raw_text: string
  context_file_paths: string[]
}): number => {
  let raw_pos = 0
  let current_display_pos = 0
  let last_raw_index = 0

  const regex =
    /`([^`]+)`|(#Changes\([^)]+\))|(#Selection)|(#SavedContext\((?:WorkspaceState|JSON) "((?:\\.|[^"\\])*)"\))|(#(?:Commit|CommitMessage)\([^:]+:([^\s"]+) "(?:\\.|[^"\\])*"\))|(#Fragment\((.+?):(\d+):(\d+)-(\d+):(\d+)\))|(#Skill\([^)]+\))|(#Image\([a-fA-F0-9]+\))|(#PastedText\([a-fA-F0-9]+:\d+\))|(#Website\([^)]+\))|(#ClipboardPaths)/g
  let match

  while ((match = regex.exec(params.raw_text)) !== null) {
    const file_path = match[1]
    const changes_symbol = match[2]
    const selection_symbol = match[3]
    const saved_context_symbol = match[4]
    const context_name = match[5]
    const commit_symbol = match[6]
    const commit_hash = match[7]
    const fragment_symbol = match[8]
    const fragment_start_line = match[10] ? parseInt(match[10], 10) : 0
    const fragment_end_line = match[12] ? parseInt(match[12], 10) : 0
    const skill_symbol = match[14]
    const image_symbol = match[15]
    const pasted_text_symbol = match[16]
    const website_symbol = match[17]
    const clipboard_paths_symbol = match[18]

    let is_replacement_match = false
    let display_match_length = 0

    if (file_path && params.context_file_paths.includes(file_path)) {
      const filename = file_path.split('/').pop() || file_path
      display_match_length = filename.length
      is_replacement_match = true
    } else if (changes_symbol) {
      const branch_name = changes_symbol.slice(9, -1)
      display_match_length = `Diff with ${branch_name}`.length
      is_replacement_match = true
    } else if (selection_symbol) {
      display_match_length = 'Selection'.length
      is_replacement_match = true
    } else if (saved_context_symbol) {
      const display_name = context_name
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\')
      display_match_length = `Context "${display_name}"`.length
      is_replacement_match = true
    } else if (commit_symbol) {
      const short_hash = commit_hash.substring(0, 7)
      display_match_length = short_hash.length
      is_replacement_match = true
    } else if (fragment_symbol) {
      const line_count = Math.max(1, fragment_end_line - fragment_start_line + 1)
      const lines_text = line_count === 1 ? 'line' : 'lines'
      display_match_length = `Pasted ${line_count} ${lines_text}`.length
      is_replacement_match = true
    } else if (skill_symbol) {
      const content = skill_symbol.slice(7, -1)
      const parts = content.split(':')
      const skill_name = parts[parts.length - 1]
      display_match_length = skill_name.length
      is_replacement_match = true
    } else if (image_symbol) {
      display_match_length = 'Image'.length
      is_replacement_match = true
    } else if (pasted_text_symbol) {
      const match = pasted_text_symbol.match(
        /^#PastedText\(([a-fA-F0-9]+):(\d+)\)$/
      )
      const token_count = match ? match[2] : null
      display_match_length = token_count
        ? `Pasted ${token_count} tokens`.length
        : 0
      is_replacement_match = true
    } else if (website_symbol) {
      const url = website_symbol.slice(9, -1)
      let label = 'Website'
      try {
        label = new URL(url).hostname
        if (label.startsWith('www.')) {
          label = label.slice(4)
        }
      } catch {}
      display_match_length = label.length
      is_replacement_match = true
    } else if (clipboard_paths_symbol) {
      display_match_length = 'Clipboard paths'.length
      is_replacement_match = true
    }

    if (!is_replacement_match) {
      continue
    }

    const raw_match_length = match[0].length
    const text_before_length = match.index - last_raw_index

    if (params.display_pos <= current_display_pos + text_before_length) {
      return raw_pos + (params.display_pos - current_display_pos)
    }

    current_display_pos += text_before_length
    raw_pos += text_before_length

    if (params.display_pos <= current_display_pos + display_match_length) {
      const pos_in_display = params.display_pos - current_display_pos
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

  return raw_pos + (params.display_pos - current_display_pos)
}

export const map_raw_pos_to_display_pos = (params: {
  raw_pos: number
  raw_text: string
  context_file_paths: string[]
}): number => {
  let display_pos = 0
  let current_raw_pos = 0
  let last_raw_index = 0

  const regex =
    /`([^`]+)`|(#Changes\([^)]+\))|(#Selection)|(#SavedContext\((?:WorkspaceState|JSON) "((?:\\.|[^"\\])*)"\))|(#(?:Commit|CommitMessage)\([^:]+:([^\s"]+) "(?:\\.|[^"\\])*"\))|(#Fragment\((.+?):(\d+):(\d+)-(\d+):(\d+)\))|(#Skill\([^)]+\))|(#Image\([a-fA-F0-9]+\))|(#PastedText\([a-fA-F0-9]+:\d+\))|(#Website\([^)]+\))|(#ClipboardPaths)/g
  let match

  while ((match = regex.exec(params.raw_text)) !== null) {
    const file_path = match[1]
    const changes_symbol = match[2]
    const selection_symbol = match[3]
    const saved_context_symbol = match[4]
    const context_name = match[5]
    const commit_symbol = match[6]
    const commit_hash = match[7]
    const fragment_symbol = match[8]
    const fragment_start_line = match[10] ? parseInt(match[10], 10) : 0
    const fragment_end_line = match[12] ? parseInt(match[12], 10) : 0
    const skill_symbol = match[14]
    const image_symbol = match[15]
    const pasted_text_symbol = match[16]
    const website_symbol = match[17]
    const clipboard_paths_symbol = match[18]

    let is_replacement_match = false
    let display_match_length = 0

    if (file_path && params.context_file_paths.includes(file_path)) {
      const filename = file_path.split('/').pop() || file_path
      display_match_length = filename.length
      is_replacement_match = true
    } else if (changes_symbol) {
      const branch_name = changes_symbol.slice(9, -1)
      display_match_length = `Diff with ${branch_name}`.length
      is_replacement_match = true
    } else if (selection_symbol) {
      display_match_length = 'Selection'.length
      is_replacement_match = true
    } else if (saved_context_symbol) {
      const display_name = context_name
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\')
      display_match_length = `Context "${display_name}"`.length
      is_replacement_match = true
    } else if (commit_symbol) {
      const short_hash = commit_hash.substring(0, 7)
      display_match_length = short_hash.length
      is_replacement_match = true
    } else if (fragment_symbol) {
      const line_count = Math.max(1, fragment_end_line - fragment_start_line + 1)
      const lines_text = line_count === 1 ? 'line' : 'lines'
      display_match_length = `Pasted ${line_count} ${lines_text}`.length
      is_replacement_match = true
    } else if (skill_symbol) {
      const content = skill_symbol.slice(7, -1)
      const parts = content.split(':')
      const skill_name = parts[parts.length - 1]
      display_match_length = skill_name.length
      is_replacement_match = true
    } else if (image_symbol) {
      display_match_length = 'Image'.length
      is_replacement_match = true
    } else if (pasted_text_symbol) {
      const match = pasted_text_symbol.match(
        /^#PastedText\(([a-fA-F0-9]+):(\d+)\)$/
      )
      const token_count = match ? match[2] : null
      display_match_length = token_count
        ? `Pasted ${token_count} tokens`.length
        : 0
      is_replacement_match = true
    } else if (website_symbol) {
      const url = website_symbol.slice(9, -1)
      let label = 'Website'
      try {
        label = new URL(url).hostname
        if (label.startsWith('www.')) {
          label = label.slice(4)
        }
      } catch {}
      display_match_length = label.length
      is_replacement_match = true
    } else if (clipboard_paths_symbol) {
      display_match_length = 'Clipboard paths'.length
      is_replacement_match = true
    }

    if (!is_replacement_match) {
      continue
    }

    const raw_match_length = match[0].length
    const text_before_length = match.index - last_raw_index
    if (params.raw_pos <= current_raw_pos + text_before_length) {
      return display_pos + (params.raw_pos - current_raw_pos)
    }
    current_raw_pos += text_before_length
    display_pos += text_before_length
    if (params.raw_pos <= current_raw_pos + raw_match_length) {
      return display_pos + display_match_length
    }
    current_raw_pos += raw_match_length
    display_pos += display_match_length
    last_raw_index = regex.lastIndex
  }
  return display_pos + (params.raw_pos - current_raw_pos)
}
