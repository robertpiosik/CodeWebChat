import { extract_paths_from_text } from '@/utils/extract-paths-from-text'

type RelevantFilesItem = {
  type: 'relevant-files'
  file_paths: string[]
}

export const parse_relevant_files = (params: {
  response: string
  workspace_files: string[]
}): RelevantFilesItem | null => {
  if (params.response.includes('```')) {
    return null
  }

  const found_paths = extract_paths_from_text(params.response)

  const valid_paths = found_paths
    .filter((path) => params.workspace_files.includes(path))
    .sort((a, b) => params.response.indexOf(a) - params.response.indexOf(b))

  if (valid_paths.length == 0) {
    return null
  }

  return {
    type: 'relevant-files',
    file_paths: valid_paths
  }
}
