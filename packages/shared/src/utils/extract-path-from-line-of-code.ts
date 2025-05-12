export const extract_path_from_line_of_code = (line: string): string | null => {
  // Check for XML-style file path declarations like <file path="...">
  const xml_path_match = line.match(/<file\s+path=["']([^"']+)["']/)
  if (xml_path_match) {
    return xml_path_match[1]
  }

  // First check if the line starts with a comment marker
  if (!/^(\s*)(\/\/|#|--|\/\*|\*|<!--)/.test(line)) {
    return null
  }

  // Strip the comment marker and surrounding whitespace
  const stripped = line
    .trim()
    .replace(/^(?:\/\/|#|--|\/\*|\*|<!--)\s*/, '')
    .trim()

  // Look for path pattern anywhere in comment with file extension
  // Matches sequences like "path/to/file.ext" or "./file.ext" or "../file.ext" or ".gitignore"
  const path_match = stripped.match(
    /(?:^|\s)((?:\.|[.\/\w\-\[\]\(\)]+\.)[\w\-]{1,10})(?:\s|$)/
  )
  if (path_match) {
    return path_match[1]
  }

  return null
}
