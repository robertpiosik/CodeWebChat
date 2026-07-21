import { extract_paths_from_text } from '@/utils/extract-paths-from-text'

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
    const code_blocks = trimmed_response.match(/```[\s\S]*?(?:```|$)/g)
    const has_valid_path_in_code_blocks = code_blocks?.some((block) =>
      params.workspace_files.some((file) => block.includes(file))
    )

    if (!has_valid_path_in_code_blocks) {
      return null
    }
  }

  const found_paths = extract_paths_from_text(trimmed_response)

  const valid_paths = found_paths
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
