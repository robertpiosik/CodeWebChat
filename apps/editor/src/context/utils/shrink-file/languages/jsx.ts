export const shrink_jsx = (content: string): string => {
  const lines = content.split(/\r?\n/)
  const result: string[] = []
  let is_in_block_comment = false
  let skip_body_depth = 0
  let last_code_buffer = ''

  for (const line of lines) {
    let processed_line = ''
    let i = 0
    let is_in_string: false | '"' | "'" | '`' = false

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

      if (char == '"' || char === "'" || char == '`') {
        is_in_string = char
        if (skip_body_depth == 0) {
          processed_line += char
        }
        last_code_buffer += char
        i++
        continue
      }

      if (char == '/' && next_char == '/') {
        break
      }

      if (char == '/' && next_char == '*') {
        is_in_block_comment = true
        i += 2
        continue
      }

      if (char == '{') {
        if (skip_body_depth > 0) {
          skip_body_depth++
          last_code_buffer += char
          i++
          continue
        } else {
          const is_keeper =
            /(^|\s)(class|interface|enum|namespace|type)(\s|$)/.test(
              last_code_buffer
            ) || /(^|\s)(import|export|default)\s*$/.test(last_code_buffer)
          const is_object_literal = /(=|:|\()\s*$/.test(
            last_code_buffer.trimEnd()
          )

          if (!is_keeper && !is_object_literal) {
            skip_body_depth = 1
            processed_line += `{}`
            last_code_buffer += '{}'
            i++
            continue
          } else {
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

      if (skip_body_depth == 0) {
        processed_line += char
      }
      last_code_buffer += char
      i++
    }

    const trimmed = processed_line.trim()
    if (trimmed) {
      result.push(processed_line.trimEnd().replace(/;+$/, ''))
    }

    last_code_buffer += ' '
    if (last_code_buffer.length > 200) {
      last_code_buffer = last_code_buffer.slice(-200)
    }
  }

  return result.length > 0 ? result.join('\n') + '\n' : ''
}
