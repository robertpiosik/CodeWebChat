type RelevantFilesItem = {
  type: 'relevant-files'
  file_paths: string[]
}

export const parse_relevant_files_from_response = (params: {
  response: string
  workspace_files: string[]
}): RelevantFilesItem | null => {
  const trimmed_response = params.response.trim()

  if (trimmed_response.includes('```')) {
    return null
  }

  const found_paths = new Set<string>()

  const inline_matches = trimmed_response.match(/`([^`]+)`/g)
  if (inline_matches) {
    inline_matches.forEach((match) => {
      found_paths.add(match.replace(/`/g, '').trim())
    })
  }

  const lines = trimmed_response.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
      let path = trimmed.substring(1).trim()
      if (path.startsWith('`') && path.endsWith('`')) {
        path = path.substring(1, path.length - 1).trim()
      }
      if (path) {
        found_paths.add(path.replace(/[.?!]+$/, ''))
      }
    }
  }

  const words = trimmed_response.replace(/`/g, ' ').split(/[\s,;:'"<>()[\]{}]+/)
  for (const word of words) {
    if (word) {
      const cleaned = word.trim().replace(/[.?!]+$/, '')
      found_paths.add(cleaned)

      if (cleaned.startsWith('./')) {
        found_paths.add(cleaned.substring(2))
      }
    }
  }

  const valid_paths = Array.from(found_paths)
    .filter((path) => params.workspace_files.includes(path))
    .sort((a, b) => params.response.indexOf(a) - params.response.indexOf(b))

  if (valid_paths.length === 0) {
    return null
  }

  return {
    type: 'relevant-files',
    file_paths: valid_paths
  }
}
