import * as vscode from 'vscode'
import { WorkspaceProvider } from '../../context/providers/workspace/workspace-provider'
import { ModelProvidersManager } from '../../services/model-providers-manager'
import {
  LAST_FIND_RELEVANT_FILES_QUERY_STATE_KEY,
  LAST_FIND_RELEVANT_FILES_SHRINK_STATE_KEY
} from '../../constants/state-keys'
import { t } from '@/i18n'

import { get_target_folder_path } from './utils/get-target-folder-path'
import { prompt_for_instructions } from './utils/prompt-for-instructions'
import { analyze_workspace_files } from './utils/analyze-workspace-files'
import { prompt_for_shrink_mode } from './utils/prompt-for-shrink-mode'
import { prompt_for_config } from './utils/prompt-for-config'
import { fetch_relevant_files_from_api } from './utils/fetch-relevant-files-from-api'
import { show_results_and_apply } from './utils/show-results-and-apply'

export const find_relevant_files_command = (
  workspace_provider: WorkspaceProvider,
  extension_context: vscode.ExtensionContext
) => {
  return vscode.commands.registerCommand(
    'codeWebChat.findRelevantFiles',
    async (item?: any) => {
      const folder_path = await get_target_folder_path(item)

      if (!folder_path) {
        vscode.window.showErrorMessage(
          t('command.find-relevant-files.error.no-folder-selected')
        )
        return
      }

      let initial_instructions =
        extension_context.workspaceState.get<string>(
          LAST_FIND_RELEVANT_FILES_QUERY_STATE_KEY
        ) || ''

      while (true) {
        const instructions = await prompt_for_instructions(initial_instructions)
        if (!instructions) return

        await extension_context.workspaceState.update(
          LAST_FIND_RELEVANT_FILES_QUERY_STATE_KEY,
          instructions
        )
        initial_instructions = instructions

        const analysis = await analyze_workspace_files({
          workspace_provider,
          folder_path
        })
        let go_back_to_input = false
        while (true) {
          const should_shrink = extension_context.workspaceState.get<boolean>(
            LAST_FIND_RELEVANT_FILES_SHRINK_STATE_KEY,
            false
          )
          const shrink_result = await prompt_for_shrink_mode({
            should_shrink,
            full_tokens: analysis.full_tokens,
            shrink_tokens: analysis.shrink_tokens
          })

          if (shrink_result === 'back') {
            go_back_to_input = true
            break
          }
          if (shrink_result === 'cancel') return

          await extension_context.workspaceState.update(
            LAST_FIND_RELEVANT_FILES_SHRINK_STATE_KEY,
            shrink_result
          )

          const api_providers_manager = new ModelProvidersManager(
            extension_context
          )
          const configs = await api_providers_manager.get_tool_configs()

          if (configs.length == 0) {
            vscode.commands.executeCommand('codeWebChat.settings')
            vscode.window.showInformationMessage(
              t('command.find-relevant-files.error.no-configs')
            )
            return
          }

          let go_back_to_shrink = false
          let force_prompt = false
          while (true) {
            const tokens_to_process = shrink_result
              ? analysis.shrink_tokens
              : analysis.full_tokens
            const config_result = await prompt_for_config({
              api_providers_manager,
              extension_context,
              configs,
              tokens_to_process,
              force_prompt
            })

            force_prompt = false

            if (config_result === 'back') {
              go_back_to_shrink = true
              break
            }
            if (config_result === 'cancel') return

            const {
              config: selected_config,
              provider,
              skipped: skipped_config
            } = config_result

            const api_result = await fetch_relevant_files_from_api(
              analysis.files_data,
              shrink_result as boolean,
              instructions,
              provider,
              selected_config
            )

            if (api_result === 'cancel') return
            if (api_result === 'error') {
              force_prompt = true
              continue
            }
            if (api_result === 'error_no_files') {
              vscode.window.showWarningMessage(
                t('command.find-relevant-files.error.no-files-found')
              )
              go_back_to_input = true
              break
            }

            const apply_result = await show_results_and_apply({
              extracted_files: api_result,
              analysis,
              workspace_provider,
              extension_context
            })

            if (apply_result === 'back') {
              if (skipped_config) {
                go_back_to_shrink = true
                break
              } else continue
            }

            if (apply_result === 'cancel' || apply_result === 'success') return
          }

          if (go_back_to_shrink) continue
          if (go_back_to_input) break
        }

        if (go_back_to_input) continue
      }
    }
  )
}
