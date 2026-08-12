import { extract_path_from_line_of_code } from '@shared/utils/extract-path-from-line-of-code'

export const strip_quotes = (path: string): string => {
  const trimmed = path.trim()
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.substring(1, trimmed.length - 1).trim()
  }
  return trimmed
}

export const is_valid_file_path = (potential_path: string): boolean => {
  const trimmed = potential_path.trim()
  return (
    !trimmed.endsWith('/') &&
    !trimmed.endsWith('\\') &&
    (trimmed.includes('.') || trimmed.includes('/')) &&
    !trimmed.includes(' ') &&
    !trimmed.includes('...') &&
    /[a-zA-Z0-9]/.test(trimmed)
  )
}

export const extract_path_from_potential_string = (line: string) => {
  let extracted = extract_path_from_line_of_code(line)
  if (extracted) extracted = extracted.trim()

  if (!extracted) {
    const xml_match = line.match(/^<[^>]+>([^<]+)<\/[^>]+>$/)
    if (xml_match && xml_match[1]) {
      const potential_path = xml_match[1].trim()
      if (
        potential_path &&
        (potential_path.includes('/') ||
          potential_path.includes('\\') ||
          potential_path.includes('.')) &&
        !potential_path.includes(' ') &&
        !potential_path.includes('...')
      ) {
        extracted = potential_path
      }
    }
  }

  if (!extracted) {
    let potential_path = line.trim()
    if (potential_path.endsWith(':')) {
      potential_path = potential_path.slice(0, -1).trim()
    }
    const backtick_match = potential_path.match(/`([^`]+)`/)
    if (backtick_match && backtick_match[1]) {
      potential_path = backtick_match[1].trim()
    }

    if (
      potential_path &&
      (potential_path.includes('/') ||
        potential_path.includes('\\') ||
        potential_path.includes('.')) &&
      !potential_path.endsWith('.') &&
      !potential_path.includes('...') &&
      /^[a-zA-Z0-9_./@-]+$/.test(potential_path)
    ) {
      extracted = potential_path
    }
  }

  return extracted ? extracted.trim() : extracted
}

export const extract_path_with_xml_fallback = (line: string) => {
  let extracted = extract_path_from_line_of_code(line)
  if (extracted) extracted = extracted.trim()

  if (!extracted) {
    const xml_match = line.match(/^<[^>]+>([^<]+)<\/[^>]+>$/)
    if (xml_match && xml_match[1]) {
      const potential_path = xml_match[1].trim()
      if (
        potential_path &&
        (potential_path.includes('/') ||
          potential_path.includes('\\') ||
          potential_path.includes('.')) &&
        !potential_path.includes(' ') &&
        !potential_path.includes('...')
      ) {
        extracted = potential_path
      }
    }
  }

  if (!extracted) {
    const match = line.match(/`([^`]+)`/)
    if (match && match[1]) {
      const potential_path = match[1].trim()
      if (
        (potential_path.includes('/') ||
          potential_path.includes('\\') ||
          potential_path.includes('.')) &&
        !potential_path.includes('...')
      ) {
        extracted = potential_path
      }
    }
  }

  return extracted ? extracted.trim() : extracted
}
