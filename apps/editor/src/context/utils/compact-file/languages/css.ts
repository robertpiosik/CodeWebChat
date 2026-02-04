export const compact_css = (content: string): string => {
  // Split by newline to process line by line, handling both LF and CRLF
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

      if (is_in_block_comment) {
        if (char == '*' && next_char == '/') {
          is_in_block_comment = false
          i += 2
        } else {
          i++
        }
        continue
      }

      if (is_in_string) {
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

      if (char == '"' || char === "'") {
        is_in_string = char
        processed_line += char
        i++
        continue
      }

      // Support // for SCSS/LESS, though not standard CSS
      if (char == '/' && next_char == '/') {
        break
      }

      if (char == '/' && next_char == '*') {
        is_in_block_comment = true
        i += 2
        continue
      }

      processed_line += char
      i++
    }

    // We trim the line to actually "compact" the file.
    const trimmed = processed_line.trim()
    if (trimmed) {
      // Filter Logic:
      // 1. Keep lines that preserve structure (containing { or })
      // 2. Strip lines that look like properties/variables (contain : or = and end in ;)
      //    Also strip SCSS/LESS at-rules that function as properties (@include, @extend, etc.)
      const has_structure = /[{}]/.test(trimmed)
      const is_property = /([:=].*|@(?:include|extend|apply).*);$/.test(trimmed)

      if (has_structure || !is_property) {
        result.push(processed_line.trimEnd())
      }
    }
  }

  return result.length > 0 ? result.join('\n') + '\n' : ''
}
