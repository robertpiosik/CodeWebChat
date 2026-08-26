import * as path from 'path'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'
import { FileAnalysisResult } from './analyze-files'
import { t } from '@/i18n'
import { show_search_results_quick_pick } from './show-search-results-quick-pick'

export const prompt_for_intelligent_search_results = async (params: {
  files: string[]
  extracted_files: string[]
  analysis: FileAnalysisResult
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
  | 'back'
  | 'cancel'
> => {
  const absolute_paths: string[] = []

  for (const extracted of params.extracted_files) {
    const matched = params.analysis.files_data.find(
      (f) => f.display_path == extracted
    )
    if (matched) {
      absolute_paths.push(matched.file_path)
    } else {
      const roots = params.workspace_provider.get_workspace_roots()
      for (const root of roots) {
        const potential_abs = path.join(root, extracted)
        if (
          params.analysis.files_data.some((f) => f.file_path == potential_abs)
        ) {
          absolute_paths.push(potential_abs)
          break
        }
      }
    }
  }

  const unique_paths = [...new Set(absolute_paths)]

  const currently_checked = params.workspace_provider.get_checked_files()

  const unmatched_checked_files =
    params.restored_unmatched_paths ??
    (params.is_search_in_selected
      ? params.files.filter(
          (f) => currently_checked.includes(f) && !unique_paths.includes(f)
        )
      : [])

  const base_title = t('feature.search-files.results.intelligent')

  return (await show_search_results_quick_pick({
    matched_items: unique_paths.map((path) => ({ path })),
    unmatched_checked_paths: unmatched_checked_files,
    workspace_provider: params.workspace_provider,
    title: base_title,
    show_back_button: true,
    resolve_cancel_as: 'cancel',
    resolve_hide_as: 'back',
    restored_selected_paths: params.restored_selected_paths
  })) as any
}
