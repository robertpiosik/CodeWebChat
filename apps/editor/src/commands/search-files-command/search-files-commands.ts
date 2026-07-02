import * as vscode from 'vscode'
import { WorkspaceProvider } from '../../context/providers/workspace/workspace-provider'
import { Logger } from '@shared/utils/logger'
import {
  LAST_SEARCH_FILES_PHRASE_QUERY_STATE_KEY,
  LAST_SEARCH_FILES_KEYWORDS_QUERY_STATE_KEY,
  LAST_SEARCH_FILES_INTELLIGENT_QUERY_STATE_KEY,
  LAST_SEARCH_FILES_FOR_CONTEXT_MODE_STATE_KEY,
  LAST_FIND_RELEVANT_FILES_SHRINK_STATE_KEY
} from '../../constants/state-keys'
import { dictionary } from '@shared/constants/dictionary'
import { t } from '@/i18n'

import { get_target_folder_path } from './utils/get-target-folder-path'
import { prompt_for_search_mode } from './utils/prompt-for-search-mode'
import { prompt_for_search_term } from './utils/prompt-for-search-term'
import { search_files_by_term } from './utils/search-files-by-term'
import { prompt_for_search_results } from './utils/prompt-for-search-results'
import { analyze_workspace_files } from './utils/analyze-workspace-files'
import { prompt_for_shrink_mode } from './utils/prompt-for-shrink-mode'
import { prompt_for_api_configuration } from './utils/prompt-for-config'
import { fetch_relevant_files_from_api } from './utils/fetch-relevant-files-from-api'
import { show_results_and_apply } from './utils/show-results-and-apply'
import { ModelProvidersManager } from '../../services/model-providers-manager'

export const search_files_commands = (
  workspace_provider: WorkspaceProvider,
  extension_context: vscode.ExtensionContext
) => {
  const search_handler = async (item?: any) => {
    const folder_path = await get_target_folder_path(item)

    let initial_search_mode =
      extension_context.workspaceState.get<
        'phrase' | 'keywords' | 'intelligent'
      >(LAST_SEARCH_FILES_FOR_CONTEXT_MODE_STATE_KEY) || 'phrase'

    while (true) {
      try {
        const mode_result = await prompt_for_search_mode(initial_search_mode)
        if (!mode_result) return

        initial_search_mode = mode_result
        const search_mode = mode_result
        await extension_context.workspaceState.update(
          LAST_SEARCH_FILES_FOR_CONTEXT_MODE_STATE_KEY,
          search_mode
        )

        let go_back_to_mode = false
        let break_outer = false

        while (true) {
          const state_key =
            search_mode == 'phrase'
              ? LAST_SEARCH_FILES_PHRASE_QUERY_STATE_KEY
              : search_mode == 'keywords'
                ? LAST_SEARCH_FILES_KEYWORDS_QUERY_STATE_KEY
                : LAST_SEARCH_FILES_INTELLIGENT_QUERY_STATE_KEY

          const initial_search_term =
            extension_context.workspaceState.get<string>(state_key) || ''

          const result = await prompt_for_search_term(
            initial_search_term,
            search_mode
          )
          if (result.back) {
            go_back_to_mode = true
            break
          }
          if (!result.value) return
          const search_term_input = result.value

          await extension_context.workspaceState.update(
            state_key,
            search_term_input
          )

          const search_term = search_term_input.trim()
          if (search_term.length == 0) return

          if (search_mode == 'intelligent') {
            const target_folder =
              folder_path || workspace_provider.get_workspace_roots()[0]

            if (!target_folder) {
              vscode.window.showErrorMessage(
                t('command.search.error.no-folder-selected')
              )
              continue
            }

            const analysis = await analyze_workspace_files({
              workspace_provider,
              folder_path: target_folder
            })

            let go_back_to_term = false

            while (true) {
              const should_shrink =
                extension_context.workspaceState.get<boolean>(
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
              if (shrink_result == 'cancel') return

              await extension_context.workspaceState.update(
                LAST_FIND_RELEVANT_FILES_SHRINK_STATE_KEY,
                shrink_result
              )

              const api_providers_manager = new ModelProvidersManager(
                extension_context
              )
              const api_configurations =
                await api_providers_manager.get_api_configurations()

              if (api_configurations.length == 0) {
                vscode.commands.executeCommand('codeWebChat.settings')
                vscode.window.showInformationMessage(
                  t('command.search.error.no-configs')
                )
                return
              }

              let go_back_to_shrink = false
              let force_prompt = false

              while (true) {
                const tokens_to_process = shrink_result
                  ? analysis.shrink_tokens
                  : analysis.full_tokens
                const api_configuration_result =
                  await prompt_for_api_configuration({
                    api_providers_manager,
                    extension_context,
                    api_configurations,
                    tokens_to_process,
                    force_prompt
                  })

                force_prompt = false

                if (api_configuration_result == 'back') {
                  go_back_to_shrink = true
                  break
                }
                if (api_configuration_result == 'cancel') return

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

                if (api_result === 'cancel') return
                if (api_result === 'error') {
                  force_prompt = true
                  continue
                }
                if (api_result === 'error_no_files') {
                  vscode.window.showWarningMessage(t('command.search.no-files'))
                  go_back_to_term = true
                  break
                }

                const apply_result = await show_results_and_apply({
                  extracted_files: api_result,
                  analysis,
                  workspace_provider,
                  extension_context
                })

                if (apply_result == 'back') {
                  go_back_to_term = true
                  break
                }

                if (apply_result == 'cancel' || apply_result == 'success') {
                  break_outer = true
                  break
                }
              }

              if (break_outer) break
              if (go_back_to_shrink) continue
              if (go_back_to_term) break
            }

            if (break_outer) break
            if (go_back_to_term) continue
            break
          }

          let all_files: string[] = []

          if (folder_path) {
            all_files = await workspace_provider.find_all_files(folder_path)
          } else {
            const roots = workspace_provider.get_workspace_roots()
            for (const root of roots) {
              const files = await workspace_provider.find_all_files(root)
              all_files.push(...files)
            }
          }

          const matched_files = await search_files_by_term({
            files: all_files,
            search_term,
            search_mode
          })

          if (matched_files.length == 0) {
            vscode.window.showInformationMessage(t('command.search.no-files'))
            continue
          }

          const selected_items = await prompt_for_search_results({
            matched_files,
            search_term,
            search_mode,
            workspace_provider
          })

          if (selected_items == 'back') {
            continue
          }

          if (!selected_items) {
            return
          }

          const selected_paths = selected_items.map((item) => item.file_path)

          const unchecked_paths = matched_files.filter(
            (file_path) => !selected_paths.includes(file_path)
          )

          const currently_checked = workspace_provider.get_checked_files()

          const paths_to_apply = [
            ...new Set([
              ...currently_checked.filter((p) => !unchecked_paths.includes(p)),
              ...selected_paths
            ])
          ]

          Logger.info({
            message: `Selected ${selected_paths.length} files from search in folder.`,
            data: { paths: selected_paths, folder: folder_path }
          })

          await workspace_provider.set_checked_files(paths_to_apply)

          const newly_selected_count = selected_paths.filter(
            (p) => !currently_checked.includes(p)
          ).length

          vscode.window.showInformationMessage(
            dictionary.information_message.ADDED_FILES_TO_CONTEXT(
              newly_selected_count
            )
          )

          break_outer = true
          break
        }

        if (break_outer) break
        if (go_back_to_mode) continue

        break
      } catch (error) {
        vscode.window.showErrorMessage(
          t('command.search.failed', {
            error: error instanceof Error ? error.message : String(error)
          })
        )
        Logger.error({
          function_name: 'search_files_command',
          message: 'Error searching files',
          data: error
        })
        break
      }
    }
  }

  return [
    vscode.commands.registerCommand('codeWebChat.searchFiles', () =>
      search_handler()
    ),
    vscode.commands.registerCommand(
      'codeWebChat.searchFilesFromDirectory',
      (item: any) => search_handler(item)
    ),
    vscode.commands.registerCommand(
      'codeWebChat.searchFilesFromFile',
      (item: any) => search_handler(item)
    )
  ]
}
