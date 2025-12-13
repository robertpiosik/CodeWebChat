import * as vscode from 'vscode'
import axios from 'axios'
import * as path from 'path'
import * as fs from 'fs'
import { FileItem } from '../utils/clipboard-parser'
import { sanitize_file_name, create_safe_path } from '@/utils/path-sanitizer'
import { Logger } from '@shared/utils/logger'
import { OriginalFileState } from '@/commands/apply-chat-response-command/types/original-file-state'
import { ToolConfig } from '@/services/model-providers-manager'
import { create_file_if_needed } from '../utils/file-operations'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { dictionary } from '@shared/constants/dictionary'
import { process_file } from '@/utils/intelligent-update-utils'
import { FileProgress } from '@/views/panel/types/messages'
import { parse_multiple_files } from '../utils/clipboard-parser/parsers'

export const handle_intelligent_update = async (params: {
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
      function_name: 'handle_intelligent_update',
      message: 'No workspace folder open for multi-file update.'
    })
    return null
  }

  Logger.info({
    function_name: 'handle_intelligent_update',
    message: 'Processing multiple files'
  })
  const raw_items = parse_multiple_files({
    response: params.chat_response,
    is_single_root_folder_workspace: params.is_single_root_folder_workspace
  })

  const raw_files = raw_items.filter(
    (item): item is FileItem => item.type == 'file'
  )

  const files: FileItem[] = []
  const skipped_files: string[] = []

  for (const file of raw_files) {
    let workspace_root = default_workspace_path!
    if (file.workspace_name && workspace_map.has(file.workspace_name)) {
      workspace_root = workspace_map.get(file.workspace_name)!
    } else if (file.workspace_name) {
      Logger.warn({
        function_name: 'handle_intelligent_update',
        message: `Workspace '${file.workspace_name}' not found for validation of '${file.file_path}'. Using default.`
      })
    }

    const sanitized_path = sanitize_file_name(file.file_path)

    if (create_safe_path(workspace_root, sanitized_path)) {
      files.push({
        ...file,
        file_path: sanitized_path
      })
    } else {
      skipped_files.push(file.file_path)
      Logger.warn({
        function_name: 'handle_intelligent_update',
        message: 'Unsafe file path detected in multi-file mode',
        data: file.file_path
      })
    }
  }

  if (skipped_files.length > 0) {
    const skipped_list = skipped_files.join('\n')
    vscode.window.showErrorMessage(
      dictionary.error_message.UNSAFE_FILE_PATHS_SKIPPED(
        skipped_files.length,
        skipped_list
      )
    )
    Logger.warn({
      function_name: 'handle_intelligent_update',
      message: 'Unsafe file paths skipped in multi-file mode',
      data: skipped_files
    })

    if (files.length == 0) {
      vscode.window.showInformationMessage(
        dictionary.information_message.NO_SAFE_FILE_PATHS_REMAINING
      )
      return null
    }
  }

  if (files.length == 0) {
    vscode.window.showErrorMessage(
      dictionary.error_message.NO_VALID_FILE_CONTENT_IN_CLIPBOARD
    )
    Logger.warn({
      function_name: 'handle_intelligent_update',
      message: 'No valid file content found in clipboard for multi-file mode.'
    })
    return null
  }

  const new_files: FileItem[] = []
  const existing_files: FileItem[] = []

  for (const file of files) {
    let file_exists = false
    let workspace_root = default_workspace_path!
    if (file.workspace_name && workspace_map.has(file.workspace_name)) {
      workspace_root = workspace_map.get(file.workspace_name)!
    }

    const full_path = path.normalize(path.join(workspace_root, file.file_path))
    file_exists = fs.existsSync(full_path)

    if (file_exists) {
      existing_files.push(file)
    } else {
      new_files.push(file)
    }
  }

  const progress_title = 'Called Intelligent Update API tool'

  const file_progress_list: FileProgress[] = files.map((f) => ({
    file_path: f.file_path,
    workspace_name: f.workspace_name,
    status: 'waiting'
  }))

  const update_progress = () => {
    if (params.panel_provider) {
      params.panel_provider.send_message({
        command: 'SHOW_PROGRESS',
        title: progress_title,
        files: [...file_progress_list]
      })
    }
  }

  const original_states: OriginalFileState[] = []
  const document_changes: {
    document: vscode.TextDocument | null // Null for new files
    content: string // New content from AI or clipboard
    isNew: boolean
    filePath: string
    workspaceName?: string
  }[] = []
  let api_calls_succeeded = false
  const max_concurrency = params.config.max_concurrency ?? 10
  const cancel_token_source = axios.CancelToken.source()
  if (params.panel_provider) {
    params.panel_provider.api_call_cancel_token_source = cancel_token_source
  }

  try {
    if (params.panel_provider) {
      update_progress()
    }

    // Pre-scan existing files and store original states
    for (const file of existing_files) {
      let workspace_root = default_workspace_path!
      if (file.workspace_name && workspace_map.has(file.workspace_name)) {
        workspace_root = workspace_map.get(file.workspace_name)!
      }
      const safe_path = create_safe_path(workspace_root, file.file_path)

      if (!safe_path) {
        Logger.error({
          function_name: 'handle_intelligent_update',
          message: 'Path validation failed pre-scan',
          data: file.file_path
        })
        continue
      }

      try {
        const file_uri = vscode.Uri.file(safe_path)
        const document = await vscode.workspace.openTextDocument(file_uri)
        const current_content = document.getText()

        original_states.push({
          file_path: file.file_path,
          content: current_content,
          workspace_name: file.workspace_name
        })
      } catch (error) {
        Logger.warn({
          function_name: 'handle_intelligent_update',
          message: 'Error opening/reading existing file pre-scan',
          data: { error, file_path: file.file_path }
        })
      }
    }

    for (const file of new_files) {
      original_states.push({
        file_path: file.file_path,
        content: '',
        file_state: 'new',
        workspace_name: file.workspace_name
      })
    }

    // Process all files in parallel batches
    for (let i = 0; i < files.length; i += max_concurrency) {
      const batch = files.slice(i, i + max_concurrency)
      const promises = batch.map(async (file) => {
        const file_progress_index = file_progress_list.findIndex(
          (p) =>
            p.file_path === file.file_path &&
            p.workspace_name === file.workspace_name
        )

        let workspace_root = default_workspace_path!
        if (file.workspace_name && workspace_map.has(file.workspace_name)) {
          workspace_root = workspace_map.get(file.workspace_name)!
        }
        const safe_path = create_safe_path(workspace_root, file.file_path)

        if (!safe_path) {
          Logger.error({
            function_name: 'handle_intelligent_update',
            message: 'Path validation failed during batch processing',
            data: file.file_path
          })
          throw new Error(`Invalid file path: ${file.file_path}`)
        }

        const file_exists = fs.existsSync(safe_path)

        if (!file_exists) {
          return {
            document: null,
            content: file.content,
            isNew: true,
            filePath: file.file_path,
            workspaceName: file.workspace_name
          }
        }

        try {
          const file_uri = vscode.Uri.file(safe_path)
          const document = await vscode.workspace.openTextDocument(file_uri)
          const document_text = document.getText()

          const original_state = original_states.find(
            (s) =>
              s.file_path == file.file_path &&
              s.workspace_name == file.workspace_name &&
              s.file_state != 'new'
          )
          const original_content_for_api = original_state
            ? original_state.content
            : document_text

          if (file_progress_index != -1) {
            file_progress_list[file_progress_index].status = 'thinking'
            update_progress()
          }

          let receiving_started = false

          const updated_content_result = await process_file({
            endpoint_url: params.endpoint_url,
            api_key: params.api_key,
            provider: { name: params.config.provider_name },
            model: params.config.model,
            temperature: params.config.temperature,
            reasoning_effort: params.config.reasoning_effort,
            file_path: file.file_path,
            file_content: original_content_for_api,
            instruction: file.content,
            cancel_token: cancel_token_source.token,
            on_chunk: (tokens_per_second, total_tokens) => {
              if (file_progress_index != -1) {
                const file_progress = file_progress_list[file_progress_index]
                if (!receiving_started) {
                  receiving_started = true
                  file_progress.status = 'receiving'
                }

                file_progress.tokens_per_second = tokens_per_second

                const estimated_total_tokens = Math.ceil(
                  original_content_for_api.length / 4
                )
                if (estimated_total_tokens > 0) {
                  file_progress.progress = Math.min(
                    Math.round((total_tokens / estimated_total_tokens) * 100),
                    100
                  )
                }
                update_progress()
              }
            },
            on_retry_attempt: () => {
              if (file_progress_index != -1) {
                receiving_started = false
                file_progress_list[file_progress_index].status = 'thinking'
                update_progress()
              }
            },
            on_retry: () => {
              if (file_progress_index != -1) {
                file_progress_list[file_progress_index].status = 'retrying'
                update_progress()
              }
            }
          })

          if (file_progress_index != -1) {
            file_progress_list[file_progress_index].status = 'done'
            file_progress_list[file_progress_index].progress = 100
            update_progress()
          }

          let final_content = updated_content_result // Already cleaned in process_file
          if (
            original_content_for_api.endsWith('\n') &&
            !final_content.endsWith('\n')
          ) {
            final_content += '\n'
          }

          return {
            document,
            content: final_content,
            isNew: false,
            filePath: file.file_path,
            workspaceName: file.workspace_name
          }
        } catch (error: any) {
          if (axios.isCancel(error) || error.message == 'Operation cancelled') {
            throw new Error('Operation cancelled')
          }
          Logger.error({
            function_name: 'handle_intelligent_update',
            message: 'Error processing existing file in batch',
            data: { error, file_path: file.file_path }
          })
          throw new Error(
            `Error processing ${file.file_path}: ${
              error.message || 'Unknown error'
            }`
          )
        }
      })

      const results = await Promise.all(promises)
      document_changes.push(...results)
    }

    api_calls_succeeded = true
  } catch (error: any) {
    Logger.error({
      function_name: 'handle_intelligent_update',
      message: 'Multi-file processing failed',
      data: error
    })

    if (error.message !== 'Operation cancelled' && !axios.isCancel(error)) {
      vscode.window.showErrorMessage(
        dictionary.error_message.ERROR_DURING_PROCESSING(error.message)
      )
    }
  } finally {
    if (params.panel_provider) {
      params.panel_provider.send_message({ command: 'HIDE_PROGRESS' })
      params.panel_provider.api_call_cancel_token_source = null
    }
  }

  if (!api_calls_succeeded) {
    return null
  }

  // Apply changes directly without review
  try {
    for (const change of document_changes) {
      let workspace_root = default_workspace_path!
      if (change.workspaceName && workspace_map.has(change.workspaceName)) {
        workspace_root = workspace_map.get(change.workspaceName)!
      }

      const safe_path = create_safe_path(workspace_root, change.filePath)
      if (!safe_path) {
        Logger.error({
          function_name: 'handle_intelligent_update',
          message: 'Path validation failed during apply phase',
          data: change.filePath
        })
        vscode.window.showWarningMessage(
          dictionary.warning_message.SKIPPING_INVALID_PATH(change.filePath)
        )
        continue
      }

      if (change.isNew) {
        const created = await create_file_if_needed({
          file_path: change.filePath,
          content: change.content,
          workspace_name: change.workspaceName
        })
        if (!created) {
          // Log error, inform user, but continue applying other changes
          Logger.error({
            function_name: 'handle_intelligent_update',
            message: 'Failed to create new file during apply phase',
            data: change.filePath
          })
          vscode.window.showWarningMessage(
            dictionary.warning_message.FAILED_TO_CREATE_FILE(change.filePath)
          )
        }
      } else {
        const document = change.document
        if (!document) {
          Logger.warn({
            function_name: 'handle_intelligent_update',
            message: 'Document missing for existing file change',
            data: change.filePath
          })
          continue
        }
        try {
          const editor = await vscode.window.showTextDocument(document)
          await editor.edit((edit) => {
            edit.replace(
              new vscode.Range(
                document.positionAt(0),
                document.positionAt(document.getText().length)
              ),
              change.content
            )
          })
          await document.save()
        } catch (error) {
          Logger.error({
            function_name: 'handle_intelligent_update',
            message: 'Failed to apply changes to existing file',
            data: { error, file_path: change.filePath }
          })
          vscode.window.showWarningMessage(
            dictionary.warning_message.FAILED_TO_APPLY_CHANGES_TO_FILE(
              change.filePath
            )
          )
        }
      }
    }

    // Since there's no review, all original_states are considered for return if API calls succeeded.
    if (original_states.length > 0) {
      return original_states
    }
  } catch (error: any) {
    Logger.error({
      function_name: 'handle_intelligent_update',
      message: 'Multi-file processing failed during apply phase',
      data: error
    })
    vscode.window.showErrorMessage(
      dictionary.error_message.ERROR_APPLYING_CHANGES(error.message)
    )
  }

  return null
}
