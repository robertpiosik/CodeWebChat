import { extract_path_from_line_of_code } from '@shared/utils/extract-path-from-line-of-code'

export const normalize_path = (path: string): string => {
  return path.replace(/\\/g, '/')
}

export const strip_quotes = (path: string): string => {
  if (path.startsWith('"') && path.endsWith('"')) {
    return path.substring(1, path.length - 1)
  }
  return path
}

export const is_valid_file_path = (potential_path: string): boolean => {
  return (
    !potential_path.endsWith('/') &&
    !potential_path.endsWith('\\') &&
    (potential_path.includes('.') || potential_path.includes('/')) &&
    !potential_path.includes(' ') &&
    /[a-zA-Z0-9]/.test(potential_path)
  )
}

export const extract_path_from_potential_string = (line: string) => {
  let extracted = extract_path_from_line_of_code(line)

  if (!extracted) {
    const xml_match = line.match(/^<[^>]+>([^<]+)<\/[^>]+>$/)
    if (xml_match && xml_match[1]) {
      const potential_path = xml_match[1].trim()
      if (
        potential_path &&
        (potential_path.includes('/') ||
          potential_path.includes('\\') ||
          potential_path.includes('.')) &&
        !potential_path.includes(' ')
      ) {
        extracted = potential_path
      }
    }
  }

  if (!extracted) {
    let potential_path = line
    if (potential_path.endsWith(':')) {
      potential_path = potential_path.slice(0, -1).trim()
    }
    const backtick_match = potential_path.match(/`([^`]+)`/)
    if (backtick_match && backtick_match[1]) {
      potential_path = backtick_match[1]
    }

    if (
      potential_path &&
      (potential_path.includes('/') ||
        potential_path.includes('\\') ||
        potential_path.includes('.')) &&
      !potential_path.endsWith('.') &&
      /^[a-zA-Z0-9_./@-]+$/.test(potential_path)
    ) {
      extracted = potential_path
    }
  }

  return extracted
}

export const extract_path_with_xml_fallback = (line: string) => {
  let extracted = extract_path_from_line_of_code(line)

  if (!extracted) {
    const xml_match = line.match(/^<[^>]+>([^<]+)<\/[^>]+>$/)
    if (xml_match && xml_match[1]) {
      const potential_path = xml_match[1].trim()
      if (
        potential_path &&
        (potential_path.includes('/') ||
          potential_path.includes('\\') ||
          potential_path.includes('.')) &&
        !potential_path.includes(' ')
      ) {
        extracted = potential_path
      }
    }
  }

  if (!extracted) {
    const match = line.match(/`([^`]+)`/)
    if (match && match[1]) {
      const potential_path = match[1]
      if (
        potential_path.includes('/') ||
        potential_path.includes('\\') ||
        potential_path.includes('.')
      ) {
        extracted = potential_path
      }
    }
  }

  return extracted
}
