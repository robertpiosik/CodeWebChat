import * as vscode from 'vscode'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'
import { t } from '@/i18n'
import { LAST_SEARCH_FILES_SEMANTIC_QUERY_STATE_KEY } from '@/constants/state-keys'
import { prompt_for_search_term } from '../utils/prompt-for-search-term'
import { search_files_by_semantic } from '../utils/search-files-by-semantic'
import { prompt_for_search_results } from '../utils/prompt-for-search-results'

export const perform_semantic_search_mode = async (params: {
  resolve_files: () => Promise<string[]>
  workspace_provider: WorkspaceProvider
  extension_context: vscode.ExtensionContext
  show_back_button?: boolean
  search_in_results: (
    matched_paths: string[]
  ) => Promise<
    { selected_paths: string[]; matched_paths: string[] } | undefined | 'back'
  >
}): Promise<
  { selected_paths: string[]; matched_paths: string[] } | undefined | 'back'
> => {
  const local_queries: Record<string, string> = {}

  while (true) {
    const initial_search_term =
      local_queries[LAST_SEARCH_FILES_SEMANTIC_QUERY_STATE_KEY] !== undefined
        ? local_queries[LAST_SEARCH_FILES_SEMANTIC_QUERY_STATE_KEY]
        : params.show_back_button
          ? ''
          : params.extension_context.workspaceState.get<string>(
              LAST_SEARCH_FILES_SEMANTIC_QUERY_STATE_KEY
            ) || ''

    const result = await prompt_for_search_term(
      initial_search_term,
      'semantic',
      undefined,
      (value) => {
        local_queries[LAST_SEARCH_FILES_SEMANTIC_QUERY_STATE_KEY] = value
        if (!params.show_back_button) {
          params.extension_context.workspaceState.update(
            LAST_SEARCH_FILES_SEMANTIC_QUERY_STATE_KEY,
            value
          )
        }
      }
    )

    if (result.back) return 'back'
    if (!result.value) return undefined

    const search_term_input = result.value
    local_queries[LAST_SEARCH_FILES_SEMANTIC_QUERY_STATE_KEY] =
      search_term_input

    if (!params.show_back_button) {
      await params.extension_context.workspaceState.update(
        LAST_SEARCH_FILES_SEMANTIC_QUERY_STATE_KEY,
        search_term_input
      )
    }

    const search_term = search_term_input.trim()
    if (search_term.length == 0) return undefined

    const files = await params.resolve_files()

    let is_cancelled = false
    let matched_files: string[] = []

    matched_files = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: t('feature.search-files.progress.searching'),
        cancellable: true
      },
      async (progress, token) => {
        token.onCancellationRequested(() => {
          is_cancelled = true
        })
        return await search_files_by_semantic({
          files,
          search_term,
          progress,
          token
        })
      }
    )

    if (is_cancelled) {
      continue
    }

    if (matched_files.length == 0) {
      vscode.window.showInformationMessage(t('feature.search-files.no-files'))
      continue
    }

    let go_back_to_term = false

    while (true) {
      const selected_items = await prompt_for_search_results({
        matched_files,
        search_term,
        search_mode: 'semantic',
        workspace_provider: params.workspace_provider
      })

      if (selected_items == 'back') {
        go_back_to_term = true
        break
      }

      if (!selected_items) {
        return undefined
      }

      if ('action' in selected_items) {
        const sub_search_result = await params.search_in_results(
          selected_items.matched_paths
        )

        if (sub_search_result === 'back') {
          continue
        }
        return sub_search_result
      }

      return selected_items
    }

    if (go_back_to_term) continue
    break
  }

  return undefined
}
