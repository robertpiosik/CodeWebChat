import * as vscode from 'vscode'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'
import { t } from '@/i18n'
import {
  LAST_SEARCH_FILES_INTELLIGENT_QUERY_STATE_KEY,
  LAST_FIND_RELEVANT_FILES_SHRINK_STATE_KEY
} from '@/constants/state-keys'
import { prompt_for_search_term } from './prompt-for-search-term'
import { analyze_files } from './analyze-files'
import { prompt_for_shrink_mode } from './prompt-for-shrink-mode'
import { prompt_for_api_configuration } from './prompt-for-config'
import { fetch_relevant_files_from_api } from './fetch-relevant-files-from-api'
import { prompt_for_intelligent_search_results } from './prompt-for-intelligent-search-results'
import { ModelProvidersManager } from '@/services/model-providers-manager'

export const perform_intelligent_search_flow = async (params: {
  files: string[]
  workspace_provider: WorkspaceProvider
  extension_context: vscode.ExtensionContext
  search_in_results: (
    matched_paths: string[]
  ) => Promise<
    { selected_paths: string[]; matched_paths: string[] } | undefined | 'back'
  >
  show_back_button?: boolean
}): Promise<
  { selected_paths: string[]; matched_paths: string[] } | undefined | 'back'
> => {
  const local_queries: Record<string, string> = {}

  while (true) {
    const initial_search_term =
      local_queries[LAST_SEARCH_FILES_INTELLIGENT_QUERY_STATE_KEY] !== undefined
        ? local_queries[LAST_SEARCH_FILES_INTELLIGENT_QUERY_STATE_KEY]
        : params.show_back_button
          ? ''
          : params.extension_context.workspaceState.get<string>(
              LAST_SEARCH_FILES_INTELLIGENT_QUERY_STATE_KEY
            ) || ''

    const result = await prompt_for_search_term(
      initial_search_term,
      'intelligent',
      undefined,
      (value) => {
        local_queries[LAST_SEARCH_FILES_INTELLIGENT_QUERY_STATE_KEY] = value
        if (!params.show_back_button) {
          params.extension_context.workspaceState.update(
            LAST_SEARCH_FILES_INTELLIGENT_QUERY_STATE_KEY,
            value
          )
        }
      }
    )
    if (result.back) return 'back'
    if (!result.value) return undefined

    const search_term = result.value.trim()
    if (search_term.length == 0) return undefined

    local_queries[LAST_SEARCH_FILES_INTELLIGENT_QUERY_STATE_KEY] = search_term
    if (!params.show_back_button) {
      await params.extension_context.workspaceState.update(
        LAST_SEARCH_FILES_INTELLIGENT_QUERY_STATE_KEY,
        search_term
      )
    }

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
      let break_outer = false
      let final_result:
        | { selected_paths: string[]; matched_paths: string[] }
        | undefined = undefined

      while (true) {
        const tokens_to_process = shrink_result
          ? analysis.shrink_tokens
          : analysis.full_tokens
        const api_configuration_result = await prompt_for_api_configuration({
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
          vscode.window.showWarningMessage(t('feature.search-files.no-files'))
          go_back_to_term = true
          break
        }

        let go_back_to_term_from_results = false
        while (true) {
          const apply_result = await prompt_for_intelligent_search_results({
            extracted_files: api_result,
            analysis,
            workspace_provider: params.workspace_provider
          })

          if (apply_result == 'back') {
            go_back_to_term_from_results = true
            break
          }
          if (apply_result == 'cancel') {
            return undefined
          }

          if ('action' in apply_result) {
            const sub_result = await params.search_in_results(
              apply_result.matched_paths
            )
            if (sub_result === 'back') {
              continue
            }
            return sub_result
          }

          final_result = apply_result
          break_outer = true
          break
        }

        if (break_outer) break
        if (go_back_to_term_from_results) {
          go_back_to_term = true
          break
        }
      }

      if (break_outer) return final_result
      if (go_back_to_shrink) continue
      if (go_back_to_term) break
    }

    if (go_back_to_term) continue
    break
  }
  return undefined
}
