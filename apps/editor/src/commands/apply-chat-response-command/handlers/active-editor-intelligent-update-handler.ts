import * as vscode from 'vscode'
import axios from 'axios'
import {
  FileItem,
  DiffItem,
  parse_response
} from '../utils/clipboard-parser/clipboard-parser'
import { sanitize_file_name, create_safe_path } from '@/utils/path-sanitizer'
import { Logger } from '@shared/utils/logger'
import { OriginalFileState } from '@/commands/apply-chat-response-command/types/original-file-state'
import { ToolConfig } from '@/services/model-providers-manager'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { dictionary } from '@shared/constants/dictionary'
import { process_file } from '@/utils/intelligent-update-utils'

export const handle_active_editor_intelligent_update = async (params: {
  endpoint_url: string
  api_key: string
  config: ToolConfig
  chat_response: string
  context: vscode.ExtensionContext
  is_single_root_folder_workspace: boolean
  panel_provider?: PanelProvider
}): Promise<OriginalFileState[] | null> => {
  const workspace_map = new Map<string, string>()
  if (vscode.workspace.workspaceFolders) {
    vscode.workspace.workspaceFolders.forEach((folder) => {
      workspace_map.set(folder.name, folder.uri.fsPath)
    })
  }
  const default_workspace_path =
    vscode.workspace.workspaceFolders?.[0]?.uri.fsPath

  if (!default_workspace_path) {
    vscode.window.showErrorMessage(
      dictionary.error_message.CANNOT_PROCESS_MULTIPLE_FILES_WITHOUT_WORKSPACE
    )
    Logger.warn({
      function_name: 'handle_active_editor_intelligent_update',
      message: 'No workspace folder open.'
    })
    return null
  }

  Logger.info({
    function_name: 'handle_active_editor_intelligent_update',
    message: 'Processing single file update'
  })

  const raw_items = parse_response({
    response: params.chat_response,
    is_single_root_folder_workspace: params.is_single_root_folder_workspace
  })

  const files = raw_items.filter(
    (item): item is FileItem | DiffItem =>
      item.type == 'file' || item.type == 'diff'
  )

  if (files.length == 0) {
    vscode.window.showErrorMessage(
      dictionary.error_message.NO_VALID_FILE_CONTENT_IN_CLIPBOARD
    )
    Logger.warn({
      function_name: 'handle_active_editor_intelligent_update',
      message: 'No valid file content found.'
    })
    return null
  }

  // We only handle the first file as this handler is intended for single-file fallback
  const file_item = files[0]

  let target_file_path = file_item.file_path
  if (file_item.type == 'diff' && file_item.new_file_path) {
    target_file_path = file_item.new_file_path
  }

  let workspace_root = default_workspace_path
  if (file_item.workspace_name && workspace_map.has(file_item.workspace_name)) {
    workspace_root = workspace_map.get(file_item.workspace_name)!
  }

  const sanitized_path = sanitize_file_name(target_file_path)
  const safe_path = create_safe_path(workspace_root, sanitized_path)

  if (!safe_path) {
    vscode.window.showErrorMessage(
      dictionary.error_message.INVALID_FILE_PATH_TRAVERSAL(target_file_path)
    )
    Logger.error({
      function_name: 'handle_active_editor_intelligent_update',
      message: 'Invalid file path',
      data: target_file_path
    })
    return null
  }

  const cancel_token_source = axios.CancelToken.source()
  if (params.panel_provider) {
    params.panel_provider.api_call_cancel_token_source = cancel_token_source
    params.panel_provider.send_message({
      command: 'SHOW_PROGRESS',
      title: 'Thinking...',
      show_elapsed_time: true,
      cancellable: true
    })
  }

  try {
    const file_uri = vscode.Uri.file(safe_path)
    // Open document to get current text (handles dirty files in editor)
    const document = await vscode.workspace.openTextDocument(file_uri)
    const original_content = document.getText()

    const updated_content = await process_file({
      endpoint_url: params.endpoint_url,
      api_key: params.api_key,
      provider: { name: params.config.provider_name },
      model: params.config.model,
      temperature: params.config.temperature,
      reasoning_effort: params.config.reasoning_effort,
      file_path: target_file_path,
      file_content: original_content,
      instruction: file_item.content,
      cancel_token: cancel_token_source.token,
      on_chunk: (tokens_per_second, total_tokens) => {
        if (params.panel_provider) {
          const estimated_total = Math.ceil(original_content.length / 4)
          let progress = 0
          if (estimated_total > 0) {
            progress = Math.min(
              Math.round((total_tokens / estimated_total) * 100),
              100
            )
          }

          params.panel_provider.send_message({
            command: 'SHOW_PROGRESS',
            title: 'Receiving...',
            tokens_per_second,
            progress
          })
        }
      },
      on_retry_attempt: () => {
        if (params.panel_provider) {
          params.panel_provider.send_message({
            command: 'SHOW_PROGRESS',
            title: 'Thinking...',
            show_elapsed_time: true,
            cancellable: true
          })
        }
      },
      on_retry: () => {
        if (params.panel_provider) {
          params.panel_provider.send_message({
            command: 'SHOW_PROGRESS',
            title: 'Retrying...',
            show_elapsed_time: true,
            cancellable: true
          })
        }
      }
    })

    let final_content = updated_content
    if (original_content.endsWith('\n') && !final_content.endsWith('\n')) {
      final_content += '\n'
    }

    const edit = new vscode.WorkspaceEdit()
    edit.replace(
      document.uri,
      new vscode.Range(
        document.positionAt(0),
        document.positionAt(document.getText().length)
      ),
      final_content
    )
    await vscode.workspace.applyEdit(edit)
    await document.save()

    return [
      {
        file_path: target_file_path,
        content: original_content,
        workspace_name: file_item.workspace_name
      }
    ]
  } catch (error: any) {
    Logger.error({
      function_name: 'handle_active_editor_intelligent_update',
      message: 'Intelligent update failed',
      data: error
    })

    if (!axios.isCancel(error) && error.message != 'Operation cancelled') {
      vscode.window.showErrorMessage(
        dictionary.error_message.ERROR_APPLYING_CHANGES(error.message)
      )
    }
    return null
  } finally {
    if (params.panel_provider) {
      params.panel_provider.send_message({
        command: 'HIDE_PROGRESS'
      })
      params.panel_provider.api_call_cancel_token_source = null
    }
  }
}
