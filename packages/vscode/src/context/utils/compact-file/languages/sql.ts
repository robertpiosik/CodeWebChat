export const compact_sql = (content: string): string => {
  const lines = content.split(/\r?\n/)
  const result: string[] = []
  let is_in_block_comment = false

  for (const line of lines) {
    let processed_line = ''
    let i = 0
    let is_in_string: false | '"' | "'" = false

    while (i < line.length) {
      const char = line[i]
      const next_char = line[i + 1]

      // Handle Block Comments
      if (is_in_block_comment) {
        if (char == '*' && next_char == '/') {
          is_in_block_comment = false
          i += 2
        } else {
          i++
        }
        continue
      }

      // Handle Strings
      if (is_in_string) {
        // specific SQL escape: double quote to escape quote (e.g. 'Don''t')
        if (char === is_in_string && next_char === is_in_string) {
          processed_line += char + next_char
          i += 2
          continue
        }
        // Backslash escape (common dialect support)
        if (char == '\\') {
          processed_line += char + (next_char || '')
          i += 2
          continue
        }
        if (char === is_in_string) {
          is_in_string = false
        }
        processed_line += char
        i++
        continue
      }

      // Start of String
      if (char == '"' || char === "'") {
        is_in_string = char
        processed_line += char
        i++
        continue
      }

      // Start of Line Comment
      if (char == '-' && next_char == '-') {
        break // Ignore the rest of the line
      }

      // Start of Block Comment
      if (char == '/' && next_char == '*') {
        is_in_block_comment = true
        i += 2
        continue
      }

      // Regular character
      processed_line += char
      i++
    }

    const trimmed = processed_line.trim()
    if (trimmed) {
      result.push(processed_line.trimEnd())
    }
  }

  return result.length > 0 ? result.join('\n') + '\n' : ''
}
