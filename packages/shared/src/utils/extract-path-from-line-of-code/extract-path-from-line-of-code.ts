export const extract_path_from_line_of_code = (line: string): string | null => {
  const xml_path_match = line.match(/<file\s+path=["']([^"']+)["']/)
  if (xml_path_match) {
    return xml_path_match[1]
  }

  if (!/^(\s*)(\/\/|#|--|\/\*|\*|<!--)/.test(line)) {
    return null
  }

  const stripped = line
    .trim()
    .replace(/^(?:\/\/|#|--|\/\*|\*|<!--)\s*/, '')
    .trim()

  const path_match = stripped.match(
    /(?:^|\s)((?:\.|[.\/\\\w\-\[\]\(\)]+\.)[\w\-]{1,10})(?:\s|$)/
  )
  if (path_match) {
    return path_match[1].replace(/\\/g, '/')
  }

  return null
}
