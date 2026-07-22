import * as vscode from 'vscode'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'
import { t } from '@/i18n'
import {
  LAST_SEARCH_FILES_PHRASE_QUERY_STATE_KEY,
  LAST_SEARCH_FILES_KEYWORDS_QUERY_STATE_KEY,
  LAST_SEARCH_FILES_KEYWORDS_MATCH_MODE_STATE_KEY,
  LAST_SEARCH_FILES_FILENAME_QUERY_STATE_KEY,
  LAST_SEARCH_FILES_FILENAME_MATCH_MODE_STATE_KEY,
  LAST_SEARCH_FILES_INTELLIGENT_QUERY_STATE_KEY,
  LAST_SEARCH_FILES_FOR_CONTEXT_MODE_STATE_KEY,
  LAST_FIND_RELEVANT_FILES_SHRINK_STATE_KEY
} from '@/constants/state-keys'
import { prompt_for_search_mode } from '../utils/prompt-for-search-mode'
import { prompt_for_keywords_match_mode } from '../utils/prompt-for-keywords-match-mode'
import { prompt_for_filename_match_mode } from '../utils/prompt-for-filename-match-mode'
import { prompt_for_search_term } from '../utils/prompt-for-search-term'
import { analyze_files } from '../utils/analyze-files'
import { prompt_for_shrink_mode } from '../utils/prompt-for-shrink-mode'
import { prompt_for_api_configuration } from '../utils/prompt-for-config'
import { fetch_relevant_files_from_api } from '../utils/fetch-relevant-files-from-api'
import { prompt_for_intelligent_search_results } from '../utils/prompt-for-intelligent-search-results'
import { search_files_by_term } from '../utils/search-files-by-term'
import { prompt_for_search_results } from '../utils/prompt-for-search-results'
import { ModelProvidersManager } from '@/services/model-providers-manager'
import { Logger } from '@shared/utils/logger'

export const search_files = async (params: {
  files: string[]
  workspace_provider: WorkspaceProvider
  extension_context: vscode.ExtensionContext
  show_back_button?: boolean
}): Promise<
  { selected_paths: string[]; matched_paths: string[] } | undefined | 'back'
> => {
  let initial_search_mode =
    params.extension_context.workspaceState.get<
      'phrase' | 'keywords' | 'filename' | 'intelligent'
    >(LAST_SEARCH_FILES_FOR_CONTEXT_MODE_STATE_KEY) || 'phrase'

  while (true) {
    try {
      const mode_result = await prompt_for_search_mode(
        initial_search_mode,
        params.show_back_button
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
        let keywords_match_mode: 'all' | 'some' = 'all'

        if (search_mode == 'keywords') {
          const last_match_mode =
            params.extension_context.workspaceState.get<'all' | 'some'>(
              LAST_SEARCH_FILES_KEYWORDS_MATCH_MODE_STATE_KEY
            ) || 'all'

          const match_mode_result =
            await prompt_for_keywords_match_mode(last_match_mode)
          if (match_mode_result == 'back') {
            go_back_to_mode = true
            break
          }
          if (!match_mode_result) return undefined

          keywords_match_mode = match_mode_result
          await params.extension_context.workspaceState.update(
            LAST_SEARCH_FILES_KEYWORDS_MATCH_MODE_STATE_KEY,
            keywords_match_mode
          )
        } else if (search_mode == 'filename') {
          const last_match_mode =
            params.extension_context.workspaceState.get<'all' | 'some'>(
              LAST_SEARCH_FILES_FILENAME_MATCH_MODE_STATE_KEY
            ) || 'all'

          const match_mode_result =
            await prompt_for_filename_match_mode(last_match_mode)
          if (match_mode_result == 'back') {
            go_back_to_mode = true
            break
          }
          if (!match_mode_result) return undefined

          keywords_match_mode = match_mode_result
          await params.extension_context.workspaceState.update(
            LAST_SEARCH_FILES_FILENAME_MATCH_MODE_STATE_KEY,
            keywords_match_mode
          )
        }

        let go_back_to_match_mode = false
        let break_match_mode = false

        while (true) {
          const state_key =
            search_mode == 'phrase'
              ? LAST_SEARCH_FILES_PHRASE_QUERY_STATE_KEY
              : search_mode == 'keywords'
                ? LAST_SEARCH_FILES_KEYWORDS_QUERY_STATE_KEY
                : search_mode == 'filename'
                  ? LAST_SEARCH_FILES_FILENAME_QUERY_STATE_KEY
                  : LAST_SEARCH_FILES_INTELLIGENT_QUERY_STATE_KEY

          const initial_search_term =
            params.extension_context.workspaceState.get<string>(state_key) || ''

          const result = await prompt_for_search_term(
            initial_search_term,
            search_mode
          )
          if (result.back) {
            if (search_mode == 'keywords' || search_mode == 'filename') {
              go_back_to_match_mode = true
            } else {
              go_back_to_mode = true
            }
            break
          }
          if (!result.value) return undefined
          const search_term_input = result.value

          await params.extension_context.workspaceState.update(
            state_key,
            search_term_input
          )

          const search_term = search_term_input.trim()
          if (search_term.length == 0) return undefined

          if (search_mode == 'intelligent') {
            const analysis = await analyze_files({
              workspace_provider: params.workspace_provider,
              files: params.files
            })

            let go_back_to_term = false

            while (true) {
              const should_shrink =
                params.extension_context.workspaceState.get<boolean>(
                  LAST_FIND_RELEVANT_FILES_SHRINK_STATE_KEY,
                  false
                )
              const shrink_result = await prompt_for_shrink_mode({
                should_shrink,
                full_tokens: analysis.full_tokens,
                shrink_tokens: analysis.shrink_tokens
              })

              if (shrink_result == 'back') {
                go_back_to_term = true
                break
              }
              if (shrink_result == 'cancel') return undefined

              await params.extension_context.workspaceState.update(
                LAST_FIND_RELEVANT_FILES_SHRINK_STATE_KEY,
                shrink_result
              )

              const model_providers_manager = new ModelProvidersManager(
                params.extension_context
              )
              const api_configurations =
                await model_providers_manager.get_api_configurations()

              if (api_configurations.length == 0) {
                vscode.commands.executeCommand('codeWebChat.settings')
                vscode.window.showInformationMessage(
                  t('feature.search-files.error.no-configs')
                )
                return undefined
              }

              let go_back_to_shrink = false
              let force_prompt = false

              while (true) {
                const tokens_to_process = shrink_result
                  ? analysis.shrink_tokens
                  : analysis.full_tokens
                const api_configuration_result =
                  await prompt_for_api_configuration({
                    model_providers_manager,
                    extension_context: params.extension_context,
                    api_configurations,
                    tokens_to_process,
                    force_prompt
                  })

                force_prompt = false

                if (api_configuration_result == 'back') {
                  go_back_to_shrink = true
                  break
                }
                if (api_configuration_result == 'cancel') return undefined

                const {
                  api_configuration: selected_api_configuration,
                  model_provider
                } = api_configuration_result

                const api_result = await fetch_relevant_files_from_api(
                  analysis.files_data,
                  shrink_result as boolean,
                  search_term,
                  model_provider,
                  selected_api_configuration
                )

                if (api_result == 'cancel') return undefined
                if (api_result == 'error') {
                  force_prompt = true
                  continue
                }
                if (api_result == 'error_no_files') {
                  vscode.window.showWarningMessage(
                    t('feature.search-files.no-files')
                  )
                  go_back_to_term = true
                  break
                }

                const apply_result =
                  await prompt_for_intelligent_search_results({
                    extracted_files: api_result,
                    analysis,
                    workspace_provider: params.workspace_provider
                  })

                if (apply_result == 'back') {
                  go_back_to_term = true
                  break
                }

                if (apply_result == 'cancel') {
                  return undefined
                }

                final_result = apply_result
                break_outer = true
                break
              }

              if (break_outer) break
              if (go_back_to_shrink) continue
              if (go_back_to_term) break
            }

            if (break_outer) break
            if (go_back_to_term) continue
            break_match_mode = true
            break
          }

          const matched_files = await search_files_by_term({
            files: params.files,
            search_term,
            search_mode,
            keywords_match_mode
          })

          if (matched_files.length == 0) {
            vscode.window.showInformationMessage(
              t('feature.search-files.no-files')
            )
            continue
          }

          const selected_items = await prompt_for_search_results({
            matched_files,
            search_term,
            search_mode,
            workspace_provider: params.workspace_provider
          })

          if (selected_items == 'back') {
            continue
          }

          if (!selected_items) {
            return undefined
          }

          final_result = selected_items
          break_outer = true
          break_match_mode = true
          break
        }

        if (break_outer) return final_result
        if (break_match_mode) break
        if (go_back_to_mode) break
        if (go_back_to_match_mode) continue
        break
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
