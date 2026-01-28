import * as vscode from 'vscode'
import axios from 'axios'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import {
  LAST_APPLIED_CHANGES_STATE_KEY,
  LAST_APPLIED_CLIPBOARD_CONTENT_STATE_KEY
} from '@/constants/state-keys'
import { OriginalFileState } from '@/commands/apply-chat-response-command/types/original-file-state'
import { dictionary } from '@shared/constants/dictionary'
import { parse_response } from '@/commands/apply-chat-response-command/utils/clipboard-parser'
import { ModelProvidersManager } from '@/services/model-providers-manager'
import {
  get_intelligent_update_config,
  process_file
} from '@/utils/intelligent-update-utils'
import { PROVIDERS } from '@shared/constants/providers'
import { create_safe_path } from '@/utils/path-sanitizer'
import { Logger } from '@shared/utils/logger'
import { set_file_fixed_with_intelligent_update } from '@/commands/apply-chat-response-command/utils/preview'

export const handle_fix_all_failed_files = async (
  panel_provider: PanelProvider,
  files_to_fix: { file_path: string; workspace_name?: string }[]
): Promise<void> => {
  const original_states = panel_provider.context.workspaceState.get<
    OriginalFileState[]
  >(LAST_APPLIED_CHANGES_STATE_KEY)
  const last_response = panel_provider.context.workspaceState.get<string>(
    LAST_APPLIED_CLIPBOARD_CONTENT_STATE_KEY
  )

  if (!original_states || !last_response) {
    vscode.window.showErrorMessage(
      dictionary.error_message.INTELLIGENT_UPDATE_CONTEXT_NOT_FOUND
    )
    return
  }

  const failed_files = original_states.filter((s) =>
    files_to_fix.some(
      (f) => f.file_path == s.file_path && f.workspace_name == s.workspace_name
    )
  )

  if (failed_files.length == 0) {
    return
  }

  const is_single_root_folder_workspace =
    (vscode.workspace.workspaceFolders?.length ?? 0) <= 1
  const parsed_response = parse_response({
    response: last_response,
    is_single_root_folder_workspace
  })

  const api_providers_manager = new ModelProvidersManager(
    panel_provider.context
  )
  const config_result = await get_intelligent_update_config(
    api_providers_manager,
    false,
    panel_provider.context
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

  const max_concurrency = intelligent_update_config.max_concurrency ?? 4

  const default_workspace_path =
    vscode.workspace.workspaceFolders?.[0]?.uri.fsPath

  // Prepare files to process
  const files_to_process = failed_files
    .map((file_state) => {
      const relevant_item = parsed_response.find((item) => {
        if (
          item.type == 'file' ||
          item.type == 'diff' ||
          item.type == 'completion'
        ) {
          return (
            item.file_path == file_state.file_path &&
            (!item.workspace_name ||
              item.workspace_name == file_state.workspace_name)
          )
        }
        return false
      })

      let instructions = ''
      if (
        relevant_item &&
        (relevant_item.type == 'file' ||
          relevant_item.type == 'diff' ||
          relevant_item.type == 'completion')
      ) {
        instructions = relevant_item.content
      }

      let workspace_root = default_workspace_path!
      if (file_state.workspace_name) {
        const folder = vscode.workspace.workspaceFolders?.find(
          (f) => f.name == file_state.workspace_name
        )
        if (folder) workspace_root = folder.uri.fsPath
      }

      const safe_path = create_safe_path(workspace_root, file_state.file_path)

      return {
        file_state,
        instructions,
        safe_path
      }
    })
    .filter((item) => item.instructions && item.safe_path)

  // Process in batches
  for (let i = 0; i < files_to_process.length; i += max_concurrency) {
    const batch = files_to_process.slice(i, i + max_concurrency)
    await Promise.all(
      batch.map(async ({ file_state, instructions, safe_path }) => {
        if (!safe_path) return

        const file_path = file_state.file_path
        const workspace_name = file_state.workspace_name

        const cancel_token_source = axios.CancelToken.source()
        panel_provider.intelligent_update_cancel_token_sources.push({
          source: cancel_token_source,
          file_path,
          workspace_name
        })

        panel_provider.send_message({
          command: 'UPDATE_FILE_PROGRESS',
          file_path,
          workspace_name,
          is_applying: true,
          apply_status: 'waiting'
        })

        const on_thinking_chunk = () => {
          panel_provider.send_message({
            command: 'UPDATE_FILE_PROGRESS',
            file_path,
            workspace_name,
            is_applying: true,
            apply_status: 'thinking'
          })
        }

        const original_file_size = file_state.content.length
        const estimated_total_tokens = Math.ceil(original_file_size / 4)

        const on_chunk = (tokens_per_second: number, total_tokens: number) => {
          let progress = 0
          if (estimated_total_tokens > 0) {
            progress = Math.min(
              Math.round((total_tokens / estimated_total_tokens) * 100),
              100
            )
          }

          panel_provider.send_message({
            command: 'UPDATE_FILE_PROGRESS',
            file_path,
            workspace_name,
            is_applying: true,
            apply_status: 'receiving',
            apply_progress: progress,
            apply_tokens_per_second: tokens_per_second
          })
        }

        const on_retry_attempt = () => {
          panel_provider.send_message({
            command: 'UPDATE_FILE_PROGRESS',
            file_path,
            workspace_name,
            is_applying: true,
            apply_status: 'thinking'
          })
        }

        const on_retry = () => {
          panel_provider.send_message({
            command: 'UPDATE_FILE_PROGRESS',
            file_path,
            workspace_name,
            is_applying: true,
            apply_status: 'retrying'
          })
        }

        try {
          const updated_content = await process_file({
            endpoint_url: endpoint_url,
            api_key: api_provider.api_key,
            provider: api_provider,
            model: intelligent_update_config.model,
            temperature: intelligent_update_config.temperature,
            reasoning_effort: intelligent_update_config.reasoning_effort,
            file_path: file_path,
            file_content: file_state.content,
            instruction: instructions,
            cancel_token: cancel_token_source.token,
            on_chunk,
            on_thinking_chunk,
            on_retry_attempt,
            on_retry
          })

          if (updated_content) {
            panel_provider.send_message({
              command: 'UPDATE_FILE_PROGRESS',
              file_path,
              workspace_name,
              is_applying: true,
              apply_status: 'done',
              apply_progress: 100
            })

            const original_ends_with_newline = file_state.content.endsWith('\n')
            const updated_ends_with_newline = updated_content.endsWith('\n')

            let final_content = updated_content
            if (original_ends_with_newline && !updated_ends_with_newline) {
              final_content = updated_content + '\n'
            } else if (
              !original_ends_with_newline &&
              updated_ends_with_newline
            ) {
              final_content = updated_content.slice(0, -1)
            }

            if (set_file_fixed_with_intelligent_update) {
              set_file_fixed_with_intelligent_update({
                file_path,
                workspace_name
              })
            }

            await vscode.workspace.fs.writeFile(
              vscode.Uri.file(safe_path),
              Buffer.from(final_content, 'utf8')
            )
          }
        } catch (error: any) {
          if (
            !axios.isCancel(error) &&
            error.message != 'User cancelled the operation'
          ) {
            Logger.error({
              function_name: 'handle_fix_all_failed_files',
              message: 'Error during process_file',
              data: { error, file_path }
            })
          }
        } finally {
          panel_provider.send_message({
            command: 'UPDATE_FILE_PROGRESS',
            file_path,
            workspace_name,
            is_applying: false
          })

          const index =
            panel_provider.intelligent_update_cancel_token_sources.findIndex(
              (s) => s.source === cancel_token_source
            )
          if (index > -1) {
            panel_provider.intelligent_update_cancel_token_sources.splice(
              index,
              1
            )
          }
        }
      })
    )
  }
}
