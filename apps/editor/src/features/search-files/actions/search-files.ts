import * as vscode from 'vscode'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'
import { t } from '@/i18n'
import {
  LAST_SEARCH_FILES_PHRASE_QUERY_STATE_KEY,
  LAST_SEARCH_FILES_KEYWORDS_QUERY_STATE_KEY,
  LAST_SEARCH_FILES_KEYWORDS_MATCH_MODE_STATE_KEY,
  LAST_SEARCH_FILES_FILENAME_QUERY_STATE_KEY,
  LAST_SEARCH_FILES_FILENAME_MATCH_MODE_STATE_KEY,
  LAST_SEARCH_FILES_KEYWORDS_TARGET_STATE_KEY,
  LAST_SEARCH_FILES_FOR_CONTEXT_MODE_STATE_KEY,
  LAST_SEARCH_FILES_SEMANTIC_QUERY_STATE_KEY
} from '@/constants/state-keys'
import { prompt_for_search_mode } from '../utils/prompt-for-search-mode'
import { prompt_for_keywords_match_mode } from '../utils/prompt-for-keywords-match-mode'
import { prompt_for_keywords_target } from '../utils/prompt-for-keywords-target'
import { prompt_for_search_term } from '../utils/prompt-for-search-term'
import { search_files_by_term } from '../utils/search-files-by-term'
import { prompt_for_search_results } from '../utils/prompt-for-search-results'
import { perform_intelligent_search_flow } from '../utils/perform-intelligent-search-flow'
import { Logger } from '@shared/utils/logger'

export const search_files = async (params: {
  get_files: () => Promise<string[]>
  workspace_provider: WorkspaceProvider
  extension_context: vscode.ExtensionContext
  show_back_button?: boolean
  is_sub_search?: boolean
}): Promise<
  { selected_paths: string[]; matched_paths: string[] } | undefined | 'back'
> => {
  let initial_search_mode =
    params.extension_context.workspaceState.get<
      'phrase' | 'keywords' | 'intelligent' | 'semantic'
    >(LAST_SEARCH_FILES_FOR_CONTEXT_MODE_STATE_KEY) || 'phrase'

  let _resolved_files: string[] | undefined
  const resolve_files = async () => {
    if (!_resolved_files) {
      _resolved_files = await params.get_files()
    }
    return _resolved_files
  }

  const local_queries: Record<string, string> = {}

  while (true) {
    try {
      const mode_result = await prompt_for_search_mode(
        initial_search_mode,
        params.show_back_button,
        params.is_sub_search
      )
      if (mode_result == 'back') return 'back'
      if (!mode_result) return undefined

      initial_search_mode = mode_result
      const search_mode = mode_result
      await params.extension_context.workspaceState.update(
        LAST_SEARCH_FILES_FOR_CONTEXT_MODE_STATE_KEY,
        search_mode
      )

      let go_back_to_mode = false
      let break_outer = false
      let final_result:
        | { selected_paths: string[]; matched_paths: string[] }
        | undefined = undefined

      while (true) {
        let keywords_target: 'contents' | 'filenames' | 'both' = 'contents'
        let keywords_match_mode: 'all' | 'some' = 'all'

        if (search_mode == 'keywords') {
          const last_target =
            params.extension_context.workspaceState.get<
              'contents' | 'filenames' | 'both'
            >(LAST_SEARCH_FILES_KEYWORDS_TARGET_STATE_KEY) || 'contents'

          const target_result = await prompt_for_keywords_target(last_target)
          if (target_result == 'back') {
            go_back_to_mode = true
            break
          }
          if (!target_result) return undefined

          keywords_target = target_result
          await params.extension_context.workspaceState.update(
            LAST_SEARCH_FILES_KEYWORDS_TARGET_STATE_KEY,
            keywords_target
          )
        }

        let go_back_to_target = false

        while (true) {
          if (search_mode == 'keywords') {
            const last_match_mode =
              params.extension_context.workspaceState.get<'all' | 'some'>(
                keywords_target == 'filenames'
                  ? LAST_SEARCH_FILES_FILENAME_MATCH_MODE_STATE_KEY
                  : LAST_SEARCH_FILES_KEYWORDS_MATCH_MODE_STATE_KEY
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
              keywords_target == 'filenames'
                ? LAST_SEARCH_FILES_FILENAME_MATCH_MODE_STATE_KEY
                : LAST_SEARCH_FILES_KEYWORDS_MATCH_MODE_STATE_KEY,
              keywords_match_mode
            )
          }

          let go_back_to_match_mode = false
          let break_match_mode = false

          while (true) {
            if (search_mode == 'intelligent') {
              const files = await resolve_files()
              const intelligent_result = await perform_intelligent_search_flow({
                files,
                workspace_provider: params.workspace_provider,
                extension_context: params.extension_context,
                show_back_button: params.show_back_button,
                search_in_results: (matched_paths) =>
                  search_files({
                    get_files: async () => matched_paths,
                    workspace_provider: params.workspace_provider,
                    extension_context: params.extension_context,
                    show_back_button: true,
                    is_sub_search: true
                  })
              })

              if (intelligent_result == 'back') {
                go_back_to_mode = true
                break
              }
              if (!intelligent_result) return undefined

              final_result = intelligent_result
              break_outer = true
              break_match_mode = true
              break
            }

            const state_key =
              search_mode == 'phrase'
                ? LAST_SEARCH_FILES_PHRASE_QUERY_STATE_KEY
                : search_mode == 'keywords'
                  ? keywords_target == 'filenames'
                    ? LAST_SEARCH_FILES_FILENAME_QUERY_STATE_KEY
                    : LAST_SEARCH_FILES_KEYWORDS_QUERY_STATE_KEY
                  : LAST_SEARCH_FILES_SEMANTIC_QUERY_STATE_KEY

            const initial_search_term =
              local_queries[state_key] !== undefined
                ? local_queries[state_key]
                : params.show_back_button
                  ? ''
                  : params.extension_context.workspaceState.get<string>(
                      state_key
                    ) || ''

            const result = await prompt_for_search_term(
              initial_search_term,
              search_mode,
              keywords_target,
              (value) => {
                local_queries[state_key] = value
                if (!params.show_back_button) {
                  params.extension_context.workspaceState.update(
                    state_key,
                    value
                  )
                }
              }
            )
            if (result.back) {
              if (search_mode == 'keywords') {
                go_back_to_match_mode = true
              } else {
                go_back_to_mode = true
              }
              break
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

            const files = await resolve_files()

            let is_cancelled = false
            let matched_files: string[] = []

            const is_filename_search =
              search_mode == 'keywords' && keywords_target == 'filenames'
            const is_small_search =
              (search_mode == 'phrase' || search_mode == 'keywords') &&
              files.length < 1000

            if (is_filename_search || is_small_search) {
              matched_files = await search_files_by_term({
                files,
                search_term,
                search_mode,
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
                  return await search_files_by_term({
                    files,
                    search_term,
                    search_mode,
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

            let go_back_to_term = false

            while (true) {
              const selected_items = await prompt_for_search_results({
                matched_files,
                search_term,
                search_mode,
                keywords_target,
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
                const sub_search_result = await search_files({
                  get_files: async () => selected_items.matched_paths,
                  workspace_provider: params.workspace_provider,
                  extension_context: params.extension_context,
                  show_back_button: true,
                  is_sub_search: true
                })

                if (sub_search_result === 'back') {
                  continue
                }
                return sub_search_result
              }

              final_result = selected_items
              break_outer = true
              break_match_mode = true
              break
            }

            if (break_outer) break
            if (go_back_to_term) continue
          }

          if (break_outer) break
          if (break_match_mode) break
          if (go_back_to_match_mode) continue
          if (go_back_to_mode) break
          if (search_mode != 'keywords') break
        }

        if (break_outer) return final_result
        if (go_back_to_mode) break
        if (go_back_to_target) continue
        if (search_mode != 'keywords') break
      }

      if (break_outer) return final_result
      if (go_back_to_mode) continue

      break
    } catch (error) {
      vscode.window.showErrorMessage(
        t('feature.search-files.failed', {
          error: error instanceof Error ? error.message : String(error)
        })
      )
      Logger.error({
        function_name: 'search_files',
        message: 'Error searching files',
        data: error
      })
      break
    }
  }
  return undefined
}
