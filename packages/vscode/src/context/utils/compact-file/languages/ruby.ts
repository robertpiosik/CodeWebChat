export const compact_ruby = (content: string): string => {
  const lines = content.split(/\r?\n/)
  const result: string[] = []
  let skip_indent_threshold = -1

  for (const line of lines) {
    // 1. Calculate Indentation
    const match = line.match(/^\s*/)
    const current_indent = match ? match[0].length : 0

    // 2. Handle Skipping (Body Stripping)
    if (skip_indent_threshold !== -1) {
      if (current_indent > skip_indent_threshold) {
        continue
      }
      skip_indent_threshold = -1
    }

    // 3. Strip Comments (simplified char loop to handle strings)
    let processed_line = ''
    let in_string: string | false = false
    let i = 0

    while (i < line.length) {
      const char = line[i]

      if (in_string) {
        if (char == '\\') {
          processed_line += char + (line[i + 1] || '')
          i += 2
          continue
        }
        // Check for end of string
        if (char === in_string) {
          processed_line += in_string
          in_string = false
          i++
          continue
        }
        processed_line += char
        i++
      } else {
        // Start of String
        if (char == '"' || char === "'") {
          in_string = char
          processed_line += char
          i++
          continue
        }
        // Start of Comment
        if (char == '#') {
          break // Ignore rest of line
        }
        processed_line += char
        i++
      }
    }

    const trimmed = processed_line.trim()
    if (!trimmed) continue

    // 4. Check for Block Start to Strip (def)
    // We only strip 'def' methods that span multiple lines (don't end with 'end')
    if (/^def\b/.test(trimmed) && !/\bend\s*$/.test(trimmed)) {
      result.push(processed_line)
      result.push(line.substring(0, current_indent) + '  ' + '# ...')
      skip_indent_threshold = current_indent
      continue
    }

    result.push(processed_line)
  }

  return result.join('\n') + '\n'
}
