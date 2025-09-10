import * as vscode from 'vscode'
import axios from 'axios'
import * as path from 'path'
import * as fs from 'fs'
import { ClipboardFile, parse_multiple_files } from '../utils/clipboard-parser'
import { sanitize_file_name, create_safe_path } from '@/utils/path-sanitizer'
import { Logger } from '@shared/utils/logger'
import { OriginalFileState } from '@/commands/apply-chat-response-command/types/original-file-state'
import { ToolConfig } from '@/services/api-providers-manager'
import { create_file_if_needed } from '../utils/file-operations'
import { ViewProvider } from '@/view/backend/view-provider'
import { process_file } from '@/utils/intelligent-update-utils'

export const handle_intelligent_update = async (params: {
  endpoint_url: string
  api_key: string
  config: ToolConfig
  chat_response: string
  context: vscode.ExtensionContext
  is_single_root_folder_workspace: boolean
  view_provider?: ViewProvider
  progress_title_override?: string
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
      'Cannot process multiple files without an open workspace folder.'
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
  const raw_files = parse_multiple_files({
    response: params.chat_response,
    is_single_root_folder_workspace: params.is_single_root_folder_workspace
  })

  const files: ClipboardFile[] = []
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
      `Detected ${skipped_files.length} unsafe file path(s) that may attempt directory traversal:\n${skipped_list}\n\nThese files will be skipped.`
    )
    Logger.warn({
      function_name: 'handle_intelligent_update',
      message: 'Unsafe file paths skipped in multi-file mode',
      data: skipped_files
    })

    if (files.length == 0) {
      vscode.window.showInformationMessage(
        'No safe file paths remaining. Operation cancelled.'
      )
      return null
    }
  }

  if (files.length == 0) {
    vscode.window.showErrorMessage('No valid file content found in clipboard.')
    Logger.warn({
      function_name: 'handle_intelligent_update',
      message: 'No valid file content found in clipboard for multi-file mode.'
    })
    return null
  }

  const new_files: ClipboardFile[] = []
  const existing_files: ClipboardFile[] = []

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

  let progress_title = ''
  if (params.progress_title_override) {
    progress_title = params.progress_title_override
  } else {
    if (existing_files.length > 0 && new_files.length > 0) {
      progress_title = `Called Intelligent Update API tool for ${
        existing_files.length
      } file${existing_files.length > 1 ? 's' : ''} and creating ${
        new_files.length
      } new file${new_files.length > 1 ? 's' : ''}`
    } else if (existing_files.length > 0) {
      progress_title = `Called Intelligent Update API tool for ${
        existing_files.length
      } file${existing_files.length > 1 ? 's' : ''}`
    } else {
      progress_title = `Creating ${new_files.length} new file${
        new_files.length > 1 ? 's' : ''
      }...`
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

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: progress_title,
      cancellable: true
    },
    async (progress, token) => {
      const cancel_token_source = axios.CancelToken.source()
      token.onCancellationRequested(() => {
        cancel_token_source.cancel('Cancelled by user.')
      })

      // Focus on the largest file for progress tracking
      let largest_file: {
        path: string
        size: number
        workspaceName?: string
      } | null = null
      let largest_file_progress = 0
      let previous_largest_file_progress = 0

      try {
        // Pre-scan existing files to find largest and store original states
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
            const content_size = current_content.length

            original_states.push({
              file_path: file.file_path,
              content: current_content,
              is_new: false,
              workspace_name: file.workspace_name
            })

            if (!largest_file || content_size > largest_file.size) {
              largest_file = {
                path: file.file_path,
                size: content_size,
                workspaceName: file.workspace_name
              }
            }
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
            is_new: true,
            workspace_name: file.workspace_name
          })
        }

        // Process all files in parallel batches
        for (let i = 0; i < files.length; i += max_concurrency) {
          if (token.isCancellationRequested) {
            Logger.info({
              function_name: 'handle_intelligent_update',
              message: 'Operation cancelled during batching.',
              data: { batch_start_index: i }
            })
            throw new Error('Operation cancelled')
          }

          const batch = files.slice(i, i + max_concurrency)
          const promises = batch.map(async (file) => {
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
                  !s.is_new
              )
              const original_content_for_api = original_state
                ? original_state.content
                : document_text

              const updated_content_result = await process_file({
                endpoint_url: params.endpoint_url,
                api_key: params.api_key,
                model: params.config.model,
                temperature: params.config.temperature,
                reasoning_effort: params.config.reasoning_effort,
                file_path: file.file_path,
                file_content: original_content_for_api,
                instruction: file.content,
                cancel_token: cancel_token_source.token,
                on_chunk: (_, tokens_per_second, total_tokens) => {
                  if (
                    largest_file &&
                    file.file_path == largest_file.path &&
                    file.workspace_name == largest_file.workspaceName
                  ) {
                    const estimated_total_tokens = Math.ceil(
                      largest_file.size / 4
                    )
                    if (estimated_total_tokens > 0) {
                      previous_largest_file_progress = largest_file_progress
                      largest_file_progress = Math.min(
                        Math.round(
                          (total_tokens / estimated_total_tokens) * 100
                        ),
                        100
                      )
                      const increment =
                        largest_file_progress - previous_largest_file_progress
                      progress.report({
                        increment: increment > 0 ? increment : 0,
                        message: `~${tokens_per_second} tokens/s`
                      })
                    }
                  }
                }
              })

              if (token.isCancellationRequested)
                throw new Error('Operation cancelled')

              if (!updated_content_result) {
                throw new Error(`Failed to apply changes to ${file.file_path}`)
              }

              let final_content = updated_content_result // Already cleaned in process_file
              if (
                original_content_for_api.endsWith('\n') &&
                !final_content.endsWith('\n')
              ) {
                final_content += '\n'
              }

              // Update progress for the largest file if processing finished
              if (
                largest_file &&
                file.file_path == largest_file.path &&
                file.workspace_name == largest_file.workspaceName &&
                largest_file_progress < 100
              ) {
                const increment = 100 - largest_file_progress
                largest_file_progress = 100
                progress.report({ increment: increment > 0 ? increment : 0 })
              }

              return {
                document,
                content: final_content,
                isNew: false,
                filePath: file.file_path,
                workspaceName: file.workspace_name
              }
            } catch (error: any) {
              if (
                axios.isCancel(error) ||
                error.message == 'Operation cancelled'
              ) {
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

        if (token.isCancellationRequested) {
          throw new Error('Operation cancelled')
        }
        api_calls_succeeded = true
      } catch (error: any) {
        cancel_token_source.cancel('Operation failed due to error.')
        Logger.error({
          function_name: 'handle_intelligent_update',
          message: 'Multi-file processing failed',
          data: error
        })

        if (error.message !== 'Operation cancelled' && !axios.isCancel(error)) {
          vscode.window.showErrorMessage(
            `An error occurred during processing: ${error.message}`
          )
        }
      }
    }
  )

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
          `Skipping applying change to invalid path: ${change.filePath}`
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
            `Failed to create file: ${change.filePath}`
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
            `Failed to apply changes to file: ${change.filePath}`
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
      `An error occurred while applying changes: ${error.message}`
    )
  }

  return null
}
