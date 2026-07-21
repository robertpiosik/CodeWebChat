export const extract_paths_from_text = (
  text: string,
  workspace_files: string[]
): string[] => {
  const found_paths = new Set<string>()
  const workspace_files_set = new Set(workspace_files)

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
    }
  }

  return Array.from(found_paths)
    .filter((p) => workspace_files_set.has(p))
    .sort((a, b) => text.indexOf(a) - text.indexOf(b))
}
