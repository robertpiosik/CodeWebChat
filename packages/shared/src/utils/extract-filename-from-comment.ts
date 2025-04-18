export const extract_filename_from_comment = (line: string): string | null => {
  const stripped = line
    .trim()
    .replace(/^(\/\/|#|--|\/\*|\*)\s*/, '')
    .trim()

  const path_match = stripped.match(/(?:[\w\-./]+\/)*[\w\-.]+\.\w{1,10}/)
  if (path_match && path_match[0]) {
    return path_match[0]
  }

  return null
}
