import * as vscode from 'vscode'
import * as path from 'path'
import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'
import { IntelligentUpdateFileInPreviewMessage } from '@/views/prompt/types/messages'
import { OriginalFileState } from '@/commands/apply-response-command/types/original-file-state'
import {
  LAST_APPLIED_CHANGES_STATE_KEY,
  LAST_APPLIED_CLIPBOARD_CONTENT_STATE_KEY
} from '@/constants/state-keys'
import { Logger } from '@shared/utils/logger'
import { parse_response } from '@/commands/apply-response-command/utils/response-parser'
import { ModelProvidersManager } from '@/services/model-providers-manager'
import {
  get_intelligent_update_config,
  process_file
} from './utils/intelligent-update-utils'
import { create_safe_path } from '@/utils/path-sanitizer'
import { dictionary } from '@shared/constants/dictionary'
import axios from 'axios'
import { set_file_applied_with_intelligent_update } from '@/commands/apply-response-command/utils/preview'

export const handle_intelligent_update_file_in_preview = async (
  prompt_view_provider: PromptViewProvider,
  message: IntelligentUpdateFileInPreviewMessage
): Promise<void> => {
  const { file_path, workspace_name, force_model_selection } = message
  const file_name = path.basename(file_path)

  const original_states =
    prompt_view_provider.extension_context.workspaceState.get<
      OriginalFileState[]
    >(LAST_APPLIED_CHANGES_STATE_KEY)
  const last_response =
    prompt_view_provider.extension_context.workspaceState.get<string>(
      LAST_APPLIED_CLIPBOARD_CONTENT_STATE_KEY
    )

  if (!original_states || !last_response) {
    vscode.window.showErrorMessage(
      dictionary.error_message.INTELLIGENT_UPDATE_CONTEXT_NOT_FOUND
    )
    return
  }

  const file_state = original_states.find(
    (s) => s.file_path == file_path && s.workspace_name == workspace_name
  )

  if (!file_state) {
    vscode.window.showErrorMessage(
      dictionary.error_message.ORIGINAL_STATE_FOR_FILE_NOT_FOUND(file_name)
    )
    return
  }

  const is_single_root_folder_workspace =
    (vscode.workspace.workspaceFolders?.length ?? 0) <= 1
  const parsed_response = parse_response({
    response: last_response,
    is_single_root_folder_workspace
  })

  let instructions = ''
  const relevant_item = parsed_response.find((item) => {
    if (
      item.type == 'file' ||
      item.type == 'diff' ||
      item.type == 'code-at-cursor'
    ) {
      const matches_path =
        item.file_path == file_path ||
        (item.type == 'diff' && item.new_file_path == file_path)

      return (
        matches_path &&
        (!item.workspace_name || item.workspace_name == workspace_name)
      )
    }
    return false
  })

  if (
    relevant_item &&
    (relevant_item.type == 'file' ||
      relevant_item.type == 'diff' ||
      relevant_item.type == 'code-at-cursor')
  ) {
    instructions = relevant_item.content
  }

  if (!instructions) {
    vscode.window.showErrorMessage(
      dictionary.error_message.UPDATE_INSTRUCTIONS_FOR_FILE_NOT_FOUND(file_name)
    )
    return
  }

  const model_providers_manager = new ModelProvidersManager(
    prompt_view_provider.extension_context
  )
  const api_configuration_result = await get_intelligent_update_config(
    model_providers_manager,
    force_model_selection ?? false,
    prompt_view_provider.extension_context
  )
  if (!api_configuration_result) return

  const {
    model_provider: api_model_provider,
    api_configuration: intelligent_update_api_configuration
  } = api_configuration_result

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

  const abort_controller = new AbortController()
  prompt_view_provider.intelligent_update_abort_controllers.push({
    controller: abort_controller,
    file_path,
    workspace_name
  })

  prompt_view_provider.send_message({
    command: 'UPDATE_FILE_PROGRESS',
    file_path,
    workspace_name,
    is_applying: true,
    apply_status: 'waiting'
  })

  const on_thinking_chunk = () => {
    prompt_view_provider.send_message({
      command: 'UPDATE_FILE_PROGRESS',
      file_path,
      workspace_name,
      is_applying: true,
      apply_status: 'thinking'
    })
  }

  // Track progress based on original file length
  const original_file_size = file_state.content.length
  const estimated_total_tokens = Math.ceil(original_file_size / 4)

  const on_chunk = (tokens_per_second: number, total_tokens: number) => {
    let progress: number | undefined
    if (estimated_total_tokens > 0) {
      progress = Math.min(
        Math.round((total_tokens / estimated_total_tokens) * 100),
        100
      )
    }

    prompt_view_provider.send_message({
      command: 'UPDATE_FILE_PROGRESS',
      file_path,
      workspace_name,
      is_applying: true,
      apply_status: 'receiving',
      apply_progress: progress,
      apply_tokens_per_second: tokens_per_second
    })
  }

  const content_promise = process_file({
    base_url: api_model_provider.base_url,
    api_key: api_model_provider.api_key,
    model_provider: api_model_provider,
    model: intelligent_update_api_configuration.model,
    reasoning_effort: intelligent_update_api_configuration.reasoning_effort,
    file_path: file_path,
    file_content: file_state.content,
    instruction: instructions,
    abort_signal: abort_controller.signal,
    on_chunk,
    on_thinking_chunk
  })

  try {
    const updated_content = await content_promise

    if (updated_content) {
      prompt_view_provider.send_message({
        command: 'UPDATE_FILE_PROGRESS',
        file_path,
        workspace_name,
        is_applying: true,
        apply_status: 'done',
        apply_progress: 100
      })

      // Preserve trailing newline from original file
      const original_ends_with_newline = file_state.content.endsWith('\n')
      const updated_ends_with_newline = updated_content.endsWith('\n')

      let final_content = updated_content
      if (original_ends_with_newline && !updated_ends_with_newline) {
        final_content = updated_content + '\n'
      } else if (!original_ends_with_newline && updated_ends_with_newline) {
        final_content = updated_content.slice(0, -1)
      }

      if (set_file_applied_with_intelligent_update) {
        set_file_applied_with_intelligent_update({
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
        function_name: 'handle_intelligent_update_file_in_preview',
        message: 'Error during process_file',
        data: { error, file_path }
      })
      vscode.window.showErrorMessage(error.message)

      await handle_intelligent_update_file_in_preview(prompt_view_provider, {
        ...message,
        force_model_selection: true
      })
      return
    }
  } finally {
    const index =
      prompt_view_provider.intelligent_update_abort_controllers.findIndex(
        (s) => s.controller === abort_controller
      )
    if (index > -1) {
      prompt_view_provider.intelligent_update_abort_controllers.splice(index, 1)
    }
    prompt_view_provider.send_message({
      command: 'UPDATE_FILE_PROGRESS',
      file_path,
      workspace_name,
      is_applying: false
    })
  }
}
