import { parse_conflict_segments } from '../parse-conflict-segments'

const escape_reg_exp = (string: string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export const apply_conflict_markers_to_content = (params: {
  original_content: string
  markers_content: string
}): string => {
  const line_ending = params.original_content.includes('\r\n') ? '\r\n' : '\n'
  let current_content = params.original_content
  const segments = parse_conflict_segments(params.markers_content)
  let cursor = 0

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    if (segment.type !== 'conflict') continue

    const prev = i > 0 ? segments[i - 1] : undefined
    const next = i < segments.length - 1 ? segments[i + 1] : undefined

    const context_before = prev && prev.type == 'common' ? prev.lines : []
    const context_after = next && next.type == 'common' ? next.lines : []

    const all_search_lines = [
      ...context_before,
      ...segment.original_lines,
      ...context_after
    ]

    const all_search_patterns = all_search_lines.map((line) => {
      const trimmed = line.trim()
      if (trimmed == '') return '[ \\t]*'
      const escaped = escape_reg_exp(trimmed)
      return `[ \\t]*${escaped}[ \\t]*`
    })

    const start_original = context_before.length
    const end_original = start_original + segment.original_lines.length

    const regex_parts: string[] = []
    if (context_before.length > 0) {
      regex_parts.push(
        `(${all_search_patterns.slice(0, start_original).join('\\r?\\n')})`
      )
    }
    if (segment.original_lines.length > 0) {
      regex_parts.push(
        `(${all_search_patterns
          .slice(start_original, end_original)
          .join('\\r?\\n')})`
      )
    }
    if (context_after.length > 0) {
      regex_parts.push(
        `(${all_search_patterns.slice(end_original).join('\\r?\\n')})`
      )
    }

    const regex = new RegExp(regex_parts.join('\\r?\\n'))
    const content_slice = current_content.slice(cursor)
    const match = regex.exec(content_slice)

    if (!match) {
      const search_text = all_search_lines.join('\n')
      throw new Error(
        `Could not find content to replace for conflict marker. Context:\n${search_text.slice(0, 100)}...`
      )
    }

    const match_index = cursor + match.index
    const matched_text = match[0]

    let group_index = 1
    const matched_before = context_before.length > 0 ? match[group_index++] : ''
    if (segment.original_lines.length > 0) group_index++
    const matched_after = context_after.length > 0 ? match[group_index++] : ''

    const updated_text = segment.updated_lines.join(line_ending)

    const replacement_parts: string[] = []
    if (matched_before) replacement_parts.push(matched_before)
    if (segment.updated_lines.length > 0) {
      replacement_parts.push(updated_text)
    }
    if (matched_after) replacement_parts.push(matched_after)

    const replacement_text = replacement_parts.join(line_ending)

    current_content =
      current_content.slice(0, match_index) +
      replacement_text +
      current_content.slice(match_index + matched_text.length)

    // Advance cursor while preserving context for the next possible conflict
    let advance_length = replacement_text.length
    if (context_after.length > 0 && matched_after) {
      const offset = replacement_text.lastIndexOf(matched_after)
      advance_length = offset > 0 ? offset - line_ending.length : 0
    }

    cursor = Math.max(0, match_index + advance_length)
  }

  return current_content
}
