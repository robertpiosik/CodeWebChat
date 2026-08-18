import { extract_paths_from_text } from '@/utils/extract-paths-from-text'

type IntelligentFileSearchResultsItem = {
  type: 'intelligent-file-search-results'
  file_paths: string[]
}

export const parse_intelligent_file_search_results = (params: {
  response: string
  workspace_files: string[]
}): IntelligentFileSearchResultsItem | null => {
  if (!params.response.startsWith('**Intelligent file search results:**')) {
    return null
  }

  const valid_paths = extract_paths_from_text({
    text: params.response,
    workspace_files: params.workspace_files
  })

  if (valid_paths.length == 0) {
    return null
  }

  return {
    type: 'intelligent-file-search-results',
    file_paths: valid_paths
  }
}
