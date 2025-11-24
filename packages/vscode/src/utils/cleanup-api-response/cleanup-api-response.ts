/**
 * Cleans up the API response by iteratively stripping away wrapper markup
 * at the beginning and end of the content, without affecting the middle content.
 * Used by intelligent update/code completions command.
 */
export const cleanup_api_response = (params: { content: string }): string => {
  let content = params.content
  let changed = true

  if (content.startsWith('<think>')) {
    const end_index = content.indexOf('</think>')
    if (end_index != -1) {
      content = content.substring(end_index + '</think>'.length)
    }
  } else if (content.startsWith('<thought>')) {
    const end_index = content.indexOf('</thought>')
    if (end_index != -1) {
      content = content.substring(end_index + '</thought>'.length)
    }
  }

  const code_block_count = (content.match(/```/g) || []).length
  if (code_block_count == 2) {
    const match = content.match(/```[^\n]*\n([\s\S]*?)\s*```/)
    if (match && typeof match[1] == 'string' && match.index !== undefined) {
      content = match[1]
    }
  }

  while (changed) {
    const original_content = content

    const opening_patterns = [
      /^```[^\n]*\n/,
      /^<files[^>]*>\s*\n?/,
      /^<file[^>]*>\s*\n?/,
      /^<!\[CDATA\[\s*\n?/,
      /^<!DOCTYPE[^>]*>\s*\n?/
    ]

    for (const pattern of opening_patterns) {
      const match = content.match(pattern)
      if (match && match.index == 0) {
        content = content.substring(match[0].length)
        break
      }
    }

    const closing_patterns = [
      /\s*```\s*$/,
      /\s*<\/files>\s*$/,
      /\s*<\/file>\s*$/,
      /\s*\]\]>\s*$/
    ]

    for (const pattern of closing_patterns) {
      const match = content.match(pattern)
      if (
        match &&
        match.index !== undefined &&
        match.index + match[0].length == content.length
      ) {
        content = content.substring(0, match.index)
        break
      }
    }

    changed = content != original_content
  }

  content = content.trim()

  return content
}
