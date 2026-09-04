import { extract_paths_from_bullet_list } from '@/utils/extract-paths-from-bullet-list'

export type IntelligentFileSearchResultsItem = {
  type: 'intelligent-file-search-results'
  file_paths: string[]
  is_search_in_selected?: boolean
  folder_path?: string
}

export const parse_intelligent_file_search_results = (params: {
  response: string
  workspace_files: string[]
}): IntelligentFileSearchResultsItem | null => {
  const match = params.response
    .trim()
    .match(/^\*\*Intelligent file search results(.*?):\*\*/)
  if (!match) {
    return null
  }

  const metadata = match[1]
  let is_search_in_selected = false
  let folder_path: string | undefined = undefined

  if (metadata.includes('selected files')) {
    is_search_in_selected = true
  }

  const folder_match = metadata.match(/folder `([^`]+)`/)
  if (folder_match) {
    folder_path = folder_match[1]
  }

  const valid_paths = extract_paths_from_bullet_list({
    text: params.response,
    workspace_files: params.workspace_files
  })

  if (valid_paths.length == 0) {
    return null
  }

  return {
    type: 'intelligent-file-search-results',
    file_paths: valid_paths,
    is_search_in_selected,
    folder_path
  }
}
