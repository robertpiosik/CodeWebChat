import { RelevantFilesItem, TextItem } from '../clipboard-parser'

export const parse_relevant_files = (params: {
  response: string
}): (RelevantFilesItem | TextItem)[] | null => {
  const trimmed_response = params.response.trim()
  const lines = trimmed_response.split('\n')

  if (lines.length == 0) {
    return null
  }

  if (!lines[0].trim().match(/^\*\*Relevant files:\*\*/i)) {
    return null
  }

  const file_paths: string[] = []
  let first_non_list_item_index = -1

  for (let i = 1; i < lines.length; i++) {
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
      first_non_list_item_index = i
      break
    }
  }

  if (file_paths.length > 0) {
    const result: (RelevantFilesItem | TextItem)[] = [
      {
        type: 'relevant-files',
        file_paths
      }
    ]

    if (first_non_list_item_index !== -1) {
      const remainingText = lines
        .slice(first_non_list_item_index)
        .join('\n')
        .trim()
      if (remainingText) {
        result.push({
          type: 'text',
          content: remainingText
        })
      }
    }

    return result
  }

  return null
}
