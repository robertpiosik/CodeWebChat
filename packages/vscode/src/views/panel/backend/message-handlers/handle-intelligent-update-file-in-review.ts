import * as vscode from 'vscode'
import * as path from 'path'
import { ViewProvider } from '@/views/panel/backend/view-provider'
import { IntelligentUpdateFileInReviewMessage } from '@/views/panel/types/messages'
import { OriginalFileState } from '@/commands/apply-chat-response-command/types/original-file-state'
import {
  LAST_APPLIED_CHANGES_STATE_KEY,
  LAST_APPLIED_CLIPBOARD_CONTENT_STATE_KEY
} from '@/constants/state-keys'
import { Logger } from '@shared/utils/logger'
import { parse_response } from '@/commands/apply-chat-response-command/utils/clipboard-parser'
import { ModelProvidersManager } from '@/services/model-providers-manager'
import { PROVIDERS } from '@shared/constants/providers'
import { process_file } from '@/utils/intelligent-update-utils'
import { create_safe_path } from '@/utils/path-sanitizer'
import { DICTIONARY } from '@/constants/dictionary'
import axios from 'axios'

const get_default_intelligent_update_config = async (
  api_providers_manager: ModelProvidersManager
): Promise<{ provider: any; config: any } | undefined> => {
  const intelligent_update_configs =
    await api_providers_manager.get_intelligent_update_tool_configs()

  if (intelligent_update_configs.length == 0) {
    vscode.commands.executeCommand('codeWebChat.settings')
    vscode.window.showInformationMessage(
      DICTIONARY.NO_INTELLIGENT_UPDATE_CONFIGURATIONS_FOUND
    )
    return
  }

  const selected_config =
    await api_providers_manager.get_default_intelligent_update_config()

  if (!selected_config) {
    vscode.commands.executeCommand('codeWebChat.settings')
    vscode.window.showInformationMessage(
      DICTIONARY.NO_DEFAULT_INTELLIGENT_UPDATE_CONFIGURATION
    )
    return
  }

  const provider = await api_providers_manager.get_provider(
    selected_config.provider_name
  )

  if (!provider) {
    vscode.window.showErrorMessage(
      DICTIONARY.error_message.API_PROVIDER_FOR_DEFAULT_CONFIG_NOT_FOUND
    )
    return
  }

  return {
    provider,
    config: selected_config
  }
}

export const handle_intelligent_update_file_in_review = async (
  provider: ViewProvider,
  message: IntelligentUpdateFileInReviewMessage
): Promise<void> => {
  const { file_path, workspace_name } = message
  const file_name = path.basename(file_path)

  const original_states = provider.context.workspaceState.get<
    OriginalFileState[]
  >(LAST_APPLIED_CHANGES_STATE_KEY)
  const last_response = provider.context.workspaceState.get<string>(
    LAST_APPLIED_CLIPBOARD_CONTENT_STATE_KEY
  )

  if (!original_states || !last_response) {
    vscode.window.showErrorMessage(
      DICTIONARY.error_message.INTELLIGENT_UPDATE_CONTEXT_NOT_FOUND
    )
    return
  }

  const file_state = original_states.find(
    (s) => s.file_path == file_path && s.workspace_name == workspace_name
  )

  if (!file_state) {
    vscode.window.showErrorMessage(
      DICTIONARY.error_message.ORIGINAL_STATE_FOR_FILE_NOT_FOUND(file_name)
    )
    return
  }

  const is_single_root_folder_workspace =
    (vscode.workspace.workspaceFolders?.length ?? 0) <= 1
  const parsed_response = parse_response(
    last_response,
    is_single_root_folder_workspace
  )

  let instructions = ''
  if (parsed_response.type == 'files' && parsed_response.files) {
    const file_data = parsed_response.files.find(
      (f) =>
        f.file_path == file_path &&
        (!f.workspace_name || f.workspace_name == workspace_name)
    )
    if (file_data) instructions = file_data.content
  } else if (parsed_response.type == 'patches' && parsed_response.patches) {
    const patch_data = parsed_response.patches.find(
      (p) =>
        p.file_path == file_path &&
        (!p.workspace_name || p.workspace_name == workspace_name)
    )
    if (patch_data) instructions = patch_data.content
  }

  if (!instructions) {
    vscode.window.showErrorMessage(
      DICTIONARY.error_message.UPDATE_INSTRUCTIONS_FOR_FILE_NOT_FOUND(file_name)
    )
    return
  }

  const api_providers_manager = new ModelProvidersManager(provider.context)
  const config_result = await get_default_intelligent_update_config(
    api_providers_manager
  )
  if (!config_result) return

  const { provider: api_provider, config: intelligent_update_config } =
    config_result

  let endpoint_url = ''
  if (api_provider.type == 'built-in') {
    const provider_info = PROVIDERS[api_provider.name as keyof typeof PROVIDERS]
    endpoint_url = provider_info.base_url
  } else {
    endpoint_url = api_provider.base_url
  }

  const default_workspace_path =
    vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
  if (!default_workspace_path) return

  let workspace_root = default_workspace_path
  if (workspace_name) {
    const folder = vscode.workspace.workspaceFolders?.find(
      (f) => f.name == workspace_name
    )
    if (folder) workspace_root = folder.uri.fsPath
  }

  const safe_path = create_safe_path(workspace_root, file_path)
  if (!safe_path) return

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: DICTIONARY.WAITING_FOR_API_RESPONSE,
      cancellable: true
    },
    async (progress, token) => {
      const cancel_token_source = axios.CancelToken.source()
      provider.intelligent_update_cancel_token_sources.push(cancel_token_source)
      token.onCancellationRequested(() => {
        cancel_token_source.cancel('Cancelled by user.')
      })

      let file_progress = 0
      let previous_file_progress = 0
      const content_size = file_state.content.length

      let wait_time = 0
      let has_started_receiving = false

      const wait_timer = setInterval(() => {
        if (!has_started_receiving) {
          progress.report({
            message: `${(wait_time / 10).toFixed(1)}s`
          })
          wait_time++
        }
      }, 100)

      try {
        const updated_content = await process_file({
          endpoint_url: endpoint_url,
          api_key: api_provider.api_key,
          model: intelligent_update_config.model,
          temperature: intelligent_update_config.temperature,
          reasoning_effort: intelligent_update_config.reasoning_effort,
          file_path: file_path,
          file_content: file_state.content,
          instruction: instructions,
          cancel_token: cancel_token_source.token,
          on_chunk: (_, tokens_per_second, total_tokens) => {
            if (!has_started_receiving) {
              has_started_receiving = true
              clearInterval(wait_timer)
            }

            const estimated_total_tokens = Math.ceil(content_size / 4)
            if (estimated_total_tokens > 0) {
              previous_file_progress = file_progress
              file_progress = Math.min(
                Math.round((total_tokens / estimated_total_tokens) * 100),
                100
              )
              const increment = file_progress - previous_file_progress
              progress.report({
                increment: increment > 0 ? increment : 0,
                message: `~${tokens_per_second} tokens/s`
              })
            }
          }
        })

        if (token.isCancellationRequested) return

        if (file_progress < 100) {
          const increment = 100 - file_progress
          progress.report({ increment: increment > 0 ? increment : 0 })
        }

        if (updated_content) {
          // Preserve trailing newline from original file
          const original_ends_with_newline = file_state.content.endsWith('\n')
          const updated_ends_with_newline = updated_content.endsWith('\n')

          let final_content = updated_content
          if (original_ends_with_newline && !updated_ends_with_newline) {
            final_content = updated_content + '\n'
          } else if (!original_ends_with_newline && updated_ends_with_newline) {
            final_content = updated_content.slice(0, -1)
          }

          await vscode.workspace.fs.writeFile(
            vscode.Uri.file(safe_path),
            Buffer.from(final_content, 'utf8')
          )
        }
      } catch (error: any) {
        if (!axios.isCancel(error) && error.message != 'Cancelled by user.') {
          Logger.error({
            function_name: 'handle_intelligent_update_file_in_review',
            message: 'Error during process_file',
            data: { error, file_path }
          })
          vscode.window.showErrorMessage(
            DICTIONARY.error_message.INTELLIGENT_UPDATE_FAILED_FOR_FILE(
              file_name,
              error.message
            )
          )
        }
      } finally {
        clearInterval(wait_timer)
        const index =
          provider.intelligent_update_cancel_token_sources.indexOf(
            cancel_token_source
          )
        if (index > -1) {
          provider.intelligent_update_cancel_token_sources.splice(index, 1)
        }
      }
    }
  )
}
