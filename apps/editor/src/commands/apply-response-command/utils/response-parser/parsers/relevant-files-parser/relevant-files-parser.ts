import { extract_paths_from_text } from '@/utils/extract-paths-from-text'

type RelevantFilesItem = {
  type: 'relevant-files'
  file_paths: string[]
}

export const parse_relevant_files = (params: {
  response: string
  workspace_files: string[]
}): RelevantFilesItem | null => {
  if (
    (params.response.includes('### Created file:') ||
      params.response.includes('### Updated file:') ||
      params.response.includes('### Deleted file:') ||
      params.response.includes('### Renamed file:')) &&
    !params.response.trimStart().startsWith('**Relevant files:**')
  ) {
    return null
  }

  const valid_paths = extract_paths_from_text(
    params.response,
    params.workspace_files
  )

  if (valid_paths.length == 0) {
    return null
  }

  return {
    type: 'relevant-files',
    file_paths: valid_paths
  }
}
