/**
 * Cleans up the API response by iteratively stripping away wrapper markup
 * at the beginning and end of the content, without affecting the middle content.
 */
export function cleanup_api_response(params: { content: string }): string {
  let content = params.content
  let changed = true

  if (content.startsWith('<think>')) {
    const think_end_index = content.indexOf('</think>')
    if (think_end_index != -1) {
      content = content.substring(think_end_index + '</think>'.length)
    }
  }

  while (changed) {
    const original_content = content

    const opening_patterns = [
      /^```[^\n]*\n/, // Markdown code block start
      /^<files[^>]*>\s*\n?/, // Files wrapper start
      /^<file[^>]*>\s*\n?/, // File wrapper start
      /^<!\[CDATA\[\s*\n?/, // CDATA start
      /^<!DOCTYPE[^>]*>\s*\n?/ // DOCTYPE declaration
    ]

    for (const pattern of opening_patterns) {
      const match = content.match(pattern)
      if (match && match.index == 0) {
        content = content.substring(match[0].length)
        break
      }
    }

    const closing_patterns = [
      /\s*```\s*$/, // Markdown code block end
      /\s*<\/files>\s*$/, // Files wrapper end
      /\s*<\/file>\s*$/, // File wrapper end
      /\s*\]\]>\s*$/, // CDATA end
      /\s*\]\]\s*$/ // Potentially incomplete CDATA end (just "]]")
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
