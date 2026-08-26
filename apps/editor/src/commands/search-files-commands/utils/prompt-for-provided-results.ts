import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'
import { t } from '@/i18n'
import { show_search_results_quick_pick } from '@/features/search-files/utils/show-search-results-quick-pick'

export const prompt_for_provided_results = async (params: {
  files: { path: string; checked: boolean }[]
  workspace_provider: WorkspaceProvider
  restored_selected_paths?: string[]
  restored_unmatched_paths?: string[]
  is_search_in_selected?: boolean
  searched_files?: string[]
}): Promise<
  | { selected_paths: string[]; matched_paths: string[]; title: string }
  | {
      action: 'search-in-results'
      matched_paths: string[]
      selected_paths: string[]
      unmatched_paths: string[]
    }
  | undefined
> => {
  const currently_checked = params.workspace_provider.get_checked_files()

  const matched_paths = params.files.map((f) => f.path)

  const unmatched_checked_files =
    params.restored_unmatched_paths ??
    (params.is_search_in_selected
      ? (params.searched_files || currently_checked).filter(
          (f) => currently_checked.includes(f) && !matched_paths.includes(f)
        )
      : [])

  const base_title = t('feature.search-files.results.intelligent')

  return (await show_search_results_quick_pick({
    matched_items: params.files,
    unmatched_checked_paths: unmatched_checked_files,
    workspace_provider: params.workspace_provider,
    title: base_title,
    show_back_button: false,
    restored_selected_paths: params.restored_selected_paths
  })) as any
}
