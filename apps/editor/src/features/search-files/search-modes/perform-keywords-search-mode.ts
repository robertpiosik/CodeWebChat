import * as vscode from 'vscode'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'
import { t } from '@/i18n'
import {
  LAST_SEARCH_FILES_KEYWORDS_TARGET_STATE_KEY,
  LAST_SEARCH_FILES_KEYWORDS_MATCH_MODE_STATE_KEY,
  LAST_SEARCH_FILES_FILENAME_MATCH_MODE_STATE_KEY,
  LAST_SEARCH_FILES_KEYWORDS_QUERY_STATE_KEY
} from '@/constants/state-keys'
import { prompt_for_keywords_target } from '../utils/prompt-for-keywords-target'
import { prompt_for_keywords_match_mode } from '../utils/prompt-for-keywords-match-mode'
import { prompt_for_search_term } from '../utils/prompt-for-search-term'
import { search_files_by_keywords } from '../utils/search-files-by-keywords'
import { prompt_for_search_results } from '../utils/prompt-for-search-results'

export const perform_keywords_search_mode = async (params: {
  resolve_files: () => Promise<string[]>
  workspace_provider: WorkspaceProvider
  extension_context: vscode.ExtensionContext
  show_back_button?: boolean
  search_in_results: (
    matched_paths: string[]
  ) => Promise<
    | { selected_paths: string[]; matched_paths: string[]; title: string }
    | undefined
    | 'back'
  >
  is_search_in_selected?: boolean
}): Promise<
  | { selected_paths: string[]; matched_paths: string[]; title: string }
  | undefined
  | 'back'
> => {
  const local_queries: Record<string, string> = {}

  while (true) {
    const state_key = LAST_SEARCH_FILES_KEYWORDS_QUERY_STATE_KEY

    const initial_search_term =
      local_queries[state_key] !== undefined
        ? local_queries[state_key]
        : params.show_back_button
          ? ''
          : params.extension_context.workspaceState.get<string>(state_key) || ''

    const result = await prompt_for_search_term(
      initial_search_term,
      'keywords',
      undefined,
      (value) => {
        local_queries[state_key] = value
        if (!params.show_back_button) {
          params.extension_context.workspaceState.update(state_key, value)
        }
      }
    )

    if (result.back) {
      return 'back'
    }
    if (!result.value) return undefined

    const search_term_input = result.value
    local_queries[state_key] = search_term_input

    if (!params.show_back_button) {
      await params.extension_context.workspaceState.update(
        state_key,
        search_term_input
      )
    }

    const search_term = search_term_input.trim()
    if (search_term.length == 0) return undefined

    let go_back_to_term = false

    while (true) {
      const last_target =
        params.extension_context.workspaceState.get<
          'contents' | 'filenames' | 'both'
        >(LAST_SEARCH_FILES_KEYWORDS_TARGET_STATE_KEY) || 'contents'

      const target_result = await prompt_for_keywords_target(last_target)
      if (target_result == 'back') {
        go_back_to_term = true
        break
      }
      if (!target_result) return undefined

      const keywords_target = target_result
      await params.extension_context.workspaceState.update(
        LAST_SEARCH_FILES_KEYWORDS_TARGET_STATE_KEY,
        keywords_target
      )

      let go_back_to_target = false

      while (true) {
        const keywords = (
          search_term.match(/(?:-?"[^"]*")|(?:-?[^\s,]+)/g) || []
        ).filter((k) => k.length > 0)

        const positive_keywords = keywords.filter((k) => !k.startsWith('-'))

        let keywords_match_mode: 'all' | 'some' = 'all'

        if (positive_keywords.length > 1) {
          const match_mode_key =
            keywords_target == 'filenames'
              ? LAST_SEARCH_FILES_FILENAME_MATCH_MODE_STATE_KEY
              : LAST_SEARCH_FILES_KEYWORDS_MATCH_MODE_STATE_KEY

          const last_match_mode =
            params.extension_context.workspaceState.get<'all' | 'some'>(
              match_mode_key
            ) || 'all'

          const match_mode_result =
            await prompt_for_keywords_match_mode(last_match_mode)

          if (match_mode_result == 'back') {
            go_back_to_target = true
            break
          }
          if (!match_mode_result) return undefined

          keywords_match_mode = match_mode_result
          await params.extension_context.workspaceState.update(
            match_mode_key,
            keywords_match_mode
          )
        }

        const files = await params.resolve_files()

        let is_cancelled = false
        let matched_files: string[] = []

        const is_fast_search =
          keywords_target == 'filenames' || files.length < 100

        if (is_fast_search) {
          matched_files = await search_files_by_keywords({
            files,
            search_term,
            keywords_target,
            keywords_match_mode
          })
        } else {
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
              return await search_files_by_keywords({
                files,
                search_term,
                keywords_target,
                keywords_match_mode,
                progress,
                token
              })
            }
          )
        }

        if (is_cancelled) {
          continue
        }

        if (matched_files.length == 0) {
          vscode.window.showInformationMessage(
            t('feature.search-files.no-files')
          )
          continue
        }

        let go_back_to_match_mode = false
        let restored_selected_paths: string[] | undefined = undefined
        let restored_unmatched_paths: string[] | undefined = undefined

        while (true) {
          const selected_items = await prompt_for_search_results({
            files,
            matched_files,
            search_term,
            search_mode: 'keywords',
            keywords_target,
            workspace_provider: params.workspace_provider,
            restored_selected_paths,
            restored_unmatched_paths,
            is_search_in_selected: params.is_search_in_selected
          })

          if (selected_items == 'back') {
            go_back_to_match_mode = true
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
              restored_selected_paths = selected_items.selected_paths
              restored_unmatched_paths = selected_items.unmatched_paths
              continue
            }
            return sub_search_result
          }

          return selected_items
        }

        if (go_back_to_match_mode) {
          if (positive_keywords.length <= 1) {
            go_back_to_target = true
            break
          }
          continue
        }
        break
      }

      if (go_back_to_target) continue
      break
    }

    if (go_back_to_term) continue
    break
  }

  return undefined
}
