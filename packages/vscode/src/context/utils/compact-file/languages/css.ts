export const compact_css = (content: string): string => {
  // Split by newline to process line by line, handling both LF and CRLF
  const lines = content.split(/\r?\n/)
  const result: string[] = []
  let is_in_block_comment = false
  let skip_body_depth = 0
  // Buffer to track context for stripping bodies (e.g. "@media ... ")
  let last_code_buffer = ''

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

      // Handle Strings (ignore comments inside strings)
      if (is_in_string) {
        if (char == '\\') {
          // Handle escaped characters inside string
          if (skip_body_depth == 0) {
            processed_line += char + (next_char || '')
          }
          last_code_buffer += char + (next_char || '')
          i += 2
          continue
        }
        if (char === is_in_string) {
          is_in_string = false
        }
        if (skip_body_depth == 0) {
          processed_line += char
        }
        last_code_buffer += char
        i++
        continue
      }

      // Start of String
      if (char == '"' || char === "'") {
        is_in_string = char
        if (skip_body_depth == 0) {
          processed_line += char
        }
        last_code_buffer += char
        i++
        continue
      }

      // Start of Line Comment (Support // for SCSS/LESS, though not standard CSS)
      if (char == '/' && next_char == '/') {
        break // Ignore the rest of the line
      }

      // Start of Block Comment
      if (char == '/' && next_char == '*') {
        is_in_block_comment = true
        i += 2
        continue
      }

      // Handle Body Stripping
      if (char == '{') {
        if (skip_body_depth > 0) {
          // Already skipping, just deepen the level
          skip_body_depth++
          last_code_buffer += char
          i++
          continue
        } else {
          // Check if we should preserve this block (at-rules like @media)
          const is_keeper =
            /(@media|@supports|@keyframes|@layer|@container)\b/.test(
              last_code_buffer
            )

          if (!is_keeper) {
            // Start skipping
            skip_body_depth = 1
            processed_line += '{}'
            last_code_buffer += '{}'
            i++
            continue
          } else {
            // Keeper: reset buffer
            last_code_buffer = ''
          }
        }
      } else if (char == '}') {
        if (skip_body_depth > 0) {
          skip_body_depth--
          last_code_buffer += char
          i++
          continue
        }
      }

      // Regular character
      if (skip_body_depth == 0) {
        processed_line += char
      }
      last_code_buffer += char
      i++
    }

    // We trim the line to actually "compact" the file.
    // If a line contained only comments, it becomes empty and is skipped.
    const trimmed = processed_line.trim()
    if (trimmed) {
      result.push(processed_line.trimEnd())
    }

    // Add a space to buffer for newline
    last_code_buffer += ' '
    // Limit buffer size
    if (last_code_buffer.length > 200) {
      last_code_buffer = last_code_buffer.slice(-200)
    }
  }

  return result.length > 0 ? result.join('\n') + '\n' : ''
}
