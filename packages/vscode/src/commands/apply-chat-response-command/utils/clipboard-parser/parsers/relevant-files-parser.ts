import { RelevantFilesItem } from '../clipboard-parser'

export const parse_relevant_files = (params: {
  response: string
}): RelevantFilesItem | null => {
  const lines = params.response.split('\n')
  let start_index = -1

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().match(/^\*\*Relevant files:\*\*/i)) {
      start_index = i
      break
    }
  }

  if (start_index == -1) {
    return null
  }

  const file_paths: string[] = []

  for (let i = start_index + 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line == '') continue

    if (line.startsWith('-') || line.startsWith('*')) {
      let path = line.substring(1).trim()
      if (path.startsWith('`') && path.endsWith('`')) {
        path = path.substring(1, path.length - 1)
      }
      if (path) {
        file_paths.push(path)
      }
    } else {
      break
    }
  }

  if (file_paths.length > 0) {
    return {
      type: 'relevant-files',
      file_paths
    }
  }

  return null
}
