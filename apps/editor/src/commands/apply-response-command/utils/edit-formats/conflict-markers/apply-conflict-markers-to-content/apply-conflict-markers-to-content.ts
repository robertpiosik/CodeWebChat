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

  const MAX_CONTEXT_LINES = 5

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    if (segment.type !== 'conflict') continue

    const prev = i > 0 ? segments[i - 1] : undefined
    const next = i < segments.length - 1 ? segments[i + 1] : undefined

    const context_before =
      prev && prev.type == 'common' ? prev.lines.slice(-MAX_CONTEXT_LINES) : []
    const context_after =
      next && next.type == 'common'
        ? next.lines.slice(0, MAX_CONTEXT_LINES)
        : []

    const clean_lines = (lines: string[]) =>
      lines.filter((l) => l.trim() !== '')

    const clean_context_before = clean_lines(context_before)
    const clean_original = clean_lines(segment.original_lines)
    const clean_context_after = clean_lines(context_after)

    const SEPARATOR = '(?:\\r?\\n[ \\t]*){1,5}'

    const build_block_pattern = (lines: string[]) => {
      return lines
        .map((line) => {
          const trimmed = line.trim()
          const escaped = escape_reg_exp(trimmed)
          return `[ \\t]*${escaped}[ \\t]*`
        })
        .join(SEPARATOR)
    }

    const regex_parts: string[] = []

    if (clean_context_before.length > 0) {
      regex_parts.push(`(${build_block_pattern(clean_context_before)})`)
    }

    if (clean_original.length > 0) {
      regex_parts.push(`(${build_block_pattern(clean_original)})`)
    }

    if (clean_context_after.length > 0) {
      regex_parts.push(`(${build_block_pattern(clean_context_after)})`)
    }

    const regex = new RegExp(regex_parts.join(SEPARATOR))
    const content_slice = current_content.slice(cursor)
    const match = regex.exec(content_slice)

    if (!match) {
      const all_search_lines = [
        ...context_before,
        ...segment.original_lines,
        ...context_after
      ]
      const search_text = all_search_lines.join('\n')
      throw new Error(
        `Could not find content to replace for conflict marker. Context:\n${search_text.slice(
          0,
          100
        )}...`
      )
    }

    const match_index = cursor + match.index
    const matched_text = match[0]

    let group_index = 1
    const matched_before =
      clean_context_before.length > 0 ? match[group_index++] : ''
    if (clean_original.length > 0) group_index++
    const matched_after =
      clean_context_after.length > 0 ? match[group_index++] : ''

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

    const content_before_after_context = matched_before
      ? matched_before + line_ending + updated_text
      : updated_text
    cursor = matched_after
      ? match_index + content_before_after_context.length
      : match_index + replacement_text.length
  }

  return current_content
}
