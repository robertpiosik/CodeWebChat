export const extract_paths_from_text = (text: string): string[] => {
  const found_paths = new Set<string>()

  const inline_matches = text.match(/`([^`]+)`/g)
  if (inline_matches) {
    inline_matches.forEach((match) => {
      found_paths.add(match.replace(/`/g, '').trim())
    })
  }

  const lines = text.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
      let path_str = trimmed.substring(1).trim()
      if (path_str.startsWith('`') && path_str.endsWith('`')) {
        path_str = path_str.substring(1, path_str.length - 1).trim()
      }
      if (path_str) {
        found_paths.add(path_str.replace(/[.?!]+$/, ''))
      }
    }
  }

  const words = text.replace(/`/g, ' ').split(/[\s,;:'"<>()[\]{}]+/)
  for (const word of words) {
    if (word) {
      const cleaned = word.trim().replace(/[.?!]+$/, '')
      found_paths.add(cleaned)

      if (cleaned.startsWith('./')) {
        found_paths.add(cleaned.substring(2))
      }
    }
  }

  return Array.from(found_paths)
}
