export const compact_jsx = (content: string): string => {
  // Split by newline to process line by line, handling both LF and CRLF
  const lines = content.split(/\r?\n/)
  const result: string[] = []
  let is_in_block_comment = false
  let skip_body_depth = 0
  // Buffer to track context for stripping bodies (e.g. "class Foo ")
  let last_code_buffer = ''

  for (const line of lines) {
    let processed_line = ''
    let i = 0
    let is_in_string: false | '"' | "'" | '`' = false

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
      if (char == '"' || char === "'" || char == '`') {
        is_in_string = char
        if (skip_body_depth == 0) {
          processed_line += char
        }
        last_code_buffer += char
        i++
        continue
      }

      // Start of Line Comment
      if (char == '/' && next_char == '/') {
        break // Ignore the rest of the line
      }

      // Start of Block Comment
      if (char == '/' && next_char == '*') {
        is_in_block_comment = true
        i += 2
        continue
      }

      // Handle Function Body Stripping
      if (char == '{') {
        if (skip_body_depth > 0) {
          // Already skipping, just deepen the level
          skip_body_depth++
          last_code_buffer += char
          i++
          continue
        } else {
          // Check if we should preserve this block (class, interface, etc.)
          // We look at last_code_buffer for keywords
          const is_keeper =
            /(^|\s)(class|interface|enum|namespace|type)(\s|$)/.test(
              last_code_buffer
            )
          // Also preserve object literals (preceded by =, :, or open paren for destructuring)
          const is_object_literal = /(=|:|\()\s*$/.test(
            last_code_buffer.trimEnd()
          )

          if (!is_keeper && !is_object_literal) {
            // Start skipping
            skip_body_depth = 1
            const indent = processed_line.match(/^\s*/)?.[0] || ''
            processed_line += `{\n${indent}  // ...\n${indent}}`
            last_code_buffer += '{}'
            i++
            continue
          } else {
            // Keeper: reset buffer to avoid false positives in nested scopes
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
      result.push(trimmed)
    }

    // Add a space to buffer for newline to avoid concatenation issues (e.g. "class Foo" + "{")
    last_code_buffer += ' '
    // Limit buffer size to avoid memory issues, keeping enough for context
    if (last_code_buffer.length > 200) {
      last_code_buffer = last_code_buffer.slice(-200)
    }
  }

  return result.length > 0 ? result.join('\n') + '\n' : ''
}
