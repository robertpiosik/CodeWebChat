export enum ParserState {
  DEFAULT = 'DEFAULT',
  IN_SINGLE_QUOTE = 'IN_SINGLE_QUOTE',
  IN_DOUBLE_QUOTE = 'IN_DOUBLE_QUOTE',
  IN_BACKTICK = 'IN_BACKTICK',
  IN_PATH = 'IN_PATH'
}

export const extract_paths_from_text = (text: string): string[] => {
  const paths: string[] = []
  let current_path = ''
  let state = ParserState.DEFAULT
  let escape_next = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]

    if (escape_next) {
      current_path += char
      escape_next = false
      continue
    }

    switch (state) {
      case ParserState.DEFAULT:
        if (char == '\\') {
          escape_next = true
        } else if (char == "'") {
          state = ParserState.IN_SINGLE_QUOTE
          current_path = ''
        } else if (char == '"') {
          state = ParserState.IN_DOUBLE_QUOTE
          current_path = ''
        } else if (char == '`') {
          state = ParserState.IN_BACKTICK
          current_path = ''
        } else if (is_path_start_char(char)) {
          state = ParserState.IN_PATH
          current_path = char
        }
        break

      case ParserState.IN_SINGLE_QUOTE:
        if (char == '\\') {
          escape_next = true
        } else if (char == "'") {
          paths.push(current_path)
          current_path = ''
          state = ParserState.DEFAULT
        } else {
          current_path += char
        }
        break

      case ParserState.IN_DOUBLE_QUOTE:
        if (char == '\\') {
          escape_next = true
        } else if (char == '"') {
          paths.push(current_path)
          current_path = ''
          state = ParserState.DEFAULT
        } else {
          current_path += char
        }
        break

      case ParserState.IN_BACKTICK:
        if (char == '\\') {
          escape_next = true
        } else if (char == '`') {
          paths.push(current_path)
          current_path = ''
          state = ParserState.DEFAULT
        } else {
          current_path += char
        }
        break

      case ParserState.IN_PATH:
        if (is_path_start_char(char)) {
          current_path += char
        } else {
          paths.push(current_path)
          current_path = ''
          state = ParserState.DEFAULT
          i--
        }
        break
    }
  }

  if (current_path.trim()) {
    paths.push(current_path.trim())
  }

  return paths
    .filter((path) => path.length > 0)
    .filter((path) => is_potential_file_path(path))
}

const is_path_start_char = (char: string): boolean => {
  return /[a-zA-Z0-9_.\-~/@]/.test(char)
}

const is_potential_file_path = (path: string): boolean => {
  const trimmed = path.trim()
  if (trimmed.length == 0) return false

  if (trimmed.includes('/') || trimmed.includes('\\')) return true

  if (/^[a-zA-Z]:|^\/|^~/.test(trimmed)) return true

  if (/\.[a-zA-Z0-9]+$/.test(trimmed) && trimmed.length > 2) {
    if (!/^\.+$/.test(trimmed)) return true
  }

  return false
}
