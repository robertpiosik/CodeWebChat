export const map_display_pos_to_raw_pos = (
  display_pos: number,
  raw_text: string,
  context_file_paths: string[]
): number => {
  let raw_pos = 0
  let current_display_pos = 0
  let last_raw_index = 0

  const regex =
    /`([^\s`]*\.[^\s`]+)`|(#Changes\([^)]+\))|(#Selection)|(#SavedContext\((?:WorkspaceState|JSON) "((?:\\.|[^"\\])*)"\))|(#(?:Commit|ContextAtCommit)\([^:]+:([^\s"]+) "(?:\\.|[^"\\])*"\))|(<fragment path="[^"]+"(?: [^>]+)?>([\s\S]*?)<\/fragment>)|(#Skill\([^)]+\))|(#Image\([a-fA-F0-9]+\))|(#Document\([a-fA-F0-9]+:\d+\))|(#Website\([^)]+\))/g
  let match

  while ((match = regex.exec(raw_text)) !== null) {
    const file_path = match[1]
    const changes_symbol = match[2]
    const selection_symbol = match[3]
    const saved_context_symbol = match[4]
    const context_name = match[5]
    const commit_symbol = match[6]
    const commit_hash = match[7]
    const fragment_symbol = match[8]
    let fragment_content = match[9]
    const skill_symbol = match[10]
    const image_symbol = match[11]
    const document_symbol = match[12]
    const website_symbol = match[13]

    let is_replacement_match = false
    let display_match_length = 0

    if (file_path && context_file_paths.includes(file_path)) {
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
      if (
        fragment_content.startsWith('\n<![CDATA[\n') &&
        fragment_content.endsWith('\n]]>\n')
      ) {
        fragment_content = fragment_content.slice(11, -5)
      } else if (
        fragment_content.startsWith('<![CDATA[') &&
        fragment_content.endsWith(']]>')
      ) {
        fragment_content = fragment_content.slice(9, -3)
      } else if (
        fragment_content.startsWith('\n') &&
        fragment_content.endsWith('\n')
      ) {
        fragment_content = fragment_content.slice(1, -1)
      }
      const line_count = fragment_content.split('\n').length
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
    } else if (document_symbol) {
      const match = document_symbol.match(/^#Document\(([a-fA-F0-9]+):(\d+)\)$/)
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
    /`([^\s`]*\.[^\s`]+)`|(#Changes\([^)]+\))|(#Selection)|(#SavedContext\((?:WorkspaceState|JSON) "((?:\\.|[^"\\])*)"\))|(#(?:Commit|ContextAtCommit)\([^:]+:([^\s"]+) "(?:\\.|[^"\\])*"\))|(<fragment path="[^"]+"(?: [^>]+)?>([\s\S]*?)<\/fragment>)|(#Skill\([^)]+\))|(#Image\([a-fA-F0-9]+\))|(#Document\([a-fA-F0-9]+:\d+\))|(#Website\([^)]+\))/g
  let match

  while ((match = regex.exec(raw_text)) !== null) {
    const file_path = match[1]
    const changes_symbol = match[2]
    const selection_symbol = match[3]
    const saved_context_symbol = match[4]
    const context_name = match[5]
    const commit_symbol = match[6]
    const commit_hash = match[7]
    const fragment_symbol = match[8]
    let fragment_content = match[9]
    const skill_symbol = match[10]
    const image_symbol = match[11]
    const document_symbol = match[12]
    const website_symbol = match[13]

    let is_replacement_match = false
    let display_match_length = 0

    if (file_path && context_file_paths.includes(file_path)) {
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
      if (
        fragment_content.startsWith('\n<![CDATA[\n') &&
        fragment_content.endsWith('\n]]>\n')
      ) {
        fragment_content = fragment_content.slice(11, -5)
      } else if (
        fragment_content.startsWith('<![CDATA[') &&
        fragment_content.endsWith(']]>')
      ) {
        fragment_content = fragment_content.slice(9, -3)
      } else if (
        fragment_content.startsWith('\n') &&
        fragment_content.endsWith('\n')
      ) {
        fragment_content = fragment_content.slice(1, -1)
      }
      const line_count = fragment_content.split('\n').length
      const lines_text = line_count == 1 ? 'line' : 'lines'
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
    } else if (document_symbol) {
      const match = document_symbol.match(/^#Document\(([a-fA-F0-9]+):(\d+)\)$/)
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
