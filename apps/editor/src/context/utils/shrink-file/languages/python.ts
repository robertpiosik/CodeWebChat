export const shrink_python = (content: string): string => {
  const lines = content.split(/\r?\n/)
  const result: string[] = []
  let skip_indent_threshold = -1

  for (const line of lines) {
    const match = line.match(/^\s*/)
    const current_indent = match ? match[0].length : 0

    if (skip_indent_threshold !== -1) {
      if (current_indent > skip_indent_threshold) {
        continue
      }
      skip_indent_threshold = -1
    }

    let processed_line = ''
    let code_part = ''
    let in_string: string | false = false
    let i = 0

    while (i < line.length) {
      const char = line[i]

      if (in_string) {
        if (char == '\\') {
          processed_line += char + (line[i + 1] || '')
          code_part += char + (line[i + 1] || '')
          i += 2
          continue
        }
        if (
          char === in_string[0] &&
          (in_string.length == 1 ||
            line.substring(i, i + in_string.length) === in_string)
        ) {
          processed_line += in_string
          code_part += in_string
          i += in_string.length
          in_string = false
          continue
        }
        processed_line += char
        code_part += char
        i++
      } else {
        if (char == '"' || char === "'") {
          const is_triple = line.substring(i, i + 3) === char.repeat(3)
          in_string = is_triple ? char.repeat(3) : char
          processed_line += in_string
          code_part += in_string
          i += in_string.length
          continue
        }
        if (char == '#') {
          processed_line += line.substring(i)
          break
        }
        processed_line += char
        code_part += char
        i++
      }
    }

    const trimmed = processed_line.trim()
    const trimmed_code = code_part.trim()
    if (!trimmed) continue

    if (trimmed_code.endsWith(':')) {
      const is_keeper = /^class\s/.test(trimmed_code)
      if (!is_keeper) {
        result.push(processed_line)
        result.push(line.substring(0, current_indent) + '    ' + '# ...')
        skip_indent_threshold = current_indent
        continue
      }
    }

    result.push(processed_line)
  }

  return result.join('\n') + '\n'
}
