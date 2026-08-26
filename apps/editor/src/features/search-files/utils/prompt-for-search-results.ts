import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'
import { t } from '@/i18n'
import { show_search_results_quick_pick } from './show-search-results-quick-pick'

export const prompt_for_search_results = async (params: {
  files: string[]
  matched_files: string[]
  search_term: string
  search_mode: 'phrase' | 'keywords' | 'intelligent'
  keywords_target?: 'contents' | 'filenames' | 'both'
  workspace_provider: WorkspaceProvider
  restored_selected_paths?: string[]
  restored_unmatched_paths?: string[]
  is_search_in_selected?: boolean
}): Promise<
  | { selected_paths: string[]; matched_paths: string[]; title: string }
  | {
      action: 'search-in-results'
      matched_paths: string[]
      selected_paths: string[]
      unmatched_paths: string[]
    }
  | undefined
  | 'back'
> => {
  const currently_checked = params.workspace_provider.get_checked_files()

  const unmatched_checked_files =
    params.restored_unmatched_paths ??
    (params.is_search_in_selected
      ? params.files.filter(
          (f) =>
            currently_checked.includes(f) && !params.matched_files.includes(f)
        )
      : [])

  const base_title =
    params.search_mode == 'keywords'
      ? params.keywords_target == 'filenames'
        ? t('feature.search-files.results.filename')
        : t('feature.search-files.results.keywords')
      : params.search_mode == 'intelligent'
        ? t('feature.search-files.results.intelligent')
        : t('feature.search-files.results.phrase')

  return (await show_search_results_quick_pick({
    matched_items: params.matched_files.map((path) => ({ path })),
    unmatched_checked_paths: unmatched_checked_files,
    workspace_provider: params.workspace_provider,
    title: base_title,
    show_back_button: true,
    restored_selected_paths: params.restored_selected_paths,
    search_mode: params.search_mode,
    search_term: params.search_term
  })) as any
}
