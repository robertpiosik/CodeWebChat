export const cleanup_api_response = (params: { content: string }): string => {
  let content = params.content.trim()

  if (content.startsWith('<think>')) {
    const end_index = content.indexOf('</think>')
    if (end_index != -1) {
      content = content.substring(end_index + '</think>'.length).trim()
    }
  } else if (content.startsWith('<thought>')) {
    const end_index = content.indexOf('</thought>')
    if (end_index != -1) {
      content = content.substring(end_index + '</thought>'.length).trim()
    }
  }

  const first_backticks = content.indexOf('```')
  const last_backticks = content.lastIndexOf('```')
  if (first_backticks !== -1 && first_backticks < last_backticks) {
    const before = content.substring(0, first_backticks).trim()
    const after = content.substring(last_backticks + 3).trim()

    if (before || after) {
      const end_of_first_line = content.indexOf('\n', first_backticks)
      if (end_of_first_line > -1 && end_of_first_line < last_backticks) {
        content = content
          .substring(end_of_first_line + 1, last_backticks)
          .trimEnd()
      }
    }
  }

  const opening_patterns = [
    /^```[^\n]*\n/,
    /^<files[^>]*>\s*\n?/,
    /^<file[^>]*>\s*\n?/,
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

  content = content.trim()

  return content
}
