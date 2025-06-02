import * as vscode from 'vscode'
import axios, { CancelToken } from 'axios'
import * as path from 'path'
import * as fs from 'fs'
import { make_api_request } from '../../../helpers/make-api-request'
import { cleanup_api_response } from '../../../helpers/cleanup-api-response'
import { get_refactoring_instruction } from '../../../constants/instructions'
import {
  ClipboardFile,
  parse_multiple_files
} from '../utils/clipboard-parser'
import {
  sanitize_file_name,
  create_safe_path
} from '../../../utils/path-sanitizer'
import { Logger } from '../../../helpers/logger'
import { format_document } from '../utils/format-document'
import { OriginalFileState } from '../../../types/common'
import { create_file_if_needed } from '../utils/file-operations'

const MAX_CONCURRENCY = 20

async function process_file(params: {
  endpoint_url: string
  api_key: string
  model: string
  file_path: string
  file_content: string
  instruction: string
  cancel_token?: CancelToken
  on_progress?: (chunk_length: number, total_length: number) => void
}): Promise<string | null> {
  Logger.log({
    function_name: 'process_file',
    message: 'start',
    data: { file_path: params.file_path }
  })
  const apply_changes_prompt = `${get_refactoring_instruction()} ${
    params.instruction
  }`
  const file_content_block = `<file path="${params.file_path}">\n<![CDATA[\n${params.file_content}\n]]>\n</file>\n`
  const content = `${file_content_block}\n${apply_changes_prompt}`

  const messages = [
    {
      role: 'user',
      content
    }
  ]

  const body = {
    messages,
    model: params.model,
    temperature: 0
  }

  Logger.log({
    function_name: 'process_file',
    message: 'API Request Body',
    data: body
  })

  try {
    const total_length = params.file_content.length // Use original file content length for progress
    let received_length = 0

    const refactored_content = await make_api_request(
      params.endpoint_url,
      params.api_key,
      body,
      params.cancel_token,
      (chunk: string) => {
        // Use chunk length for progress reporting as it represents received data
        received_length += chunk.length
        if (params.on_progress) {
          // Cap received length at total length for display
          params.on_progress(
            Math.min(received_length, total_length),
            total_length
          )
        }
      }
    )

    if (axios.isCancel(params.cancel_token?.reason)) {
      Logger.log({
        function_name: 'process_file',
        message: 'Request cancelled during API call',
        data: params.file_path
      })
      return null // Silent cancellation
    }

    if (!refactored_content) {
      vscode.window.showErrorMessage(
        `Applying changes to ${params.file_path} failed. Empty response from API.`
      )
      Logger.error({
        function_name: 'process_file',
        message: 'API request returned empty response',
        data: params.file_path
      })
      return null
    }

    const cleaned_content = cleanup_api_response({
      content: refactored_content
    })
    Logger.log({
      function_name: 'process_file',
      message: 'API response received and cleaned',
      data: {
        file_path: params.file_path,
        response_length: cleaned_content?.length
      }
    })
    return cleaned_content
  } catch (error: any) {
    // First check for cancellation
    if (axios.isCancel(error)) {
      Logger.log({
        function_name: 'process_file',
        message: 'Request cancelled',
        data: params.file_path
      })
      return null // Silent cancellation
    }

    // For other errors, show the error message as before
    Logger.error({
      function_name: 'process_file',
      message: 'Refactoring error',
      data: { error, file_path: params.file_path }
    })
    console.error(`Refactoring error for ${params.file_path}:`, error)
    vscode.window.showErrorMessage(
      `An error occurred during refactoring ${params.file_path}. See console for details.`
    )
    return null
  }
}

export async function handle_intelligent_update(params: {
  endpoint_url: string
  api_key: string
  model: string
  chat_response: string
  context: vscode.ExtensionContext
  is_single_root_folder_workspace: boolean
}): Promise<OriginalFileState[] | null> {
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

  Logger.log({
    function_name: 'handle_intelligent_update',
    message: 'Processing multiple files'
  })
  // Handle multiple files with AI processing ('Intelligent update' mode)
  const raw_files = parse_multiple_files({
    response: params.chat_response,
    is_single_root_folder_workspace: params.is_single_root_folder_workspace
  })

  // Sanitize file paths and check safety
  const files: ClipboardFile[] = []
  const skipped_files: string[] = []

  for (const file of raw_files) {
    // Determine the correct workspace root for validation
    let workspace_root = default_workspace_path! // Should exist due to earlier check
    if (file.workspace_name && workspace_map.has(file.workspace_name)) {
      workspace_root = workspace_map.get(file.workspace_name)!
    } else if (file.workspace_name) {
      Logger.warn({
        function_name: 'handle_intelligent_update',
        message: `Workspace '${file.workspace_name}' not found for validation of '${file.file_path}'. Using default.`
      })
    }

    const sanitized_path = sanitize_file_name(file.file_path)

    // Check if the path would be safe within its intended workspace
    if (create_safe_path(workspace_root, sanitized_path)) {
      files.push({
        ...file,
        file_path: sanitized_path // Use sanitized path
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

  // Show warning if unsafe paths were detected
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

  // First, identify which files are new (don't exist in workspace)
  const new_files: ClipboardFile[] = []
  const existing_files: ClipboardFile[] = []

  for (const file of files) {
    // Check if file exists in workspace
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

  // If there are new files, ask for confirmation before proceeding
  if (new_files.length > 0) {
    const new_file_list = new_files
      .map(
        (file) =>
          `${file.workspace_name ? `[${file.workspace_name}] ` : ''}${
            file.file_path
          }`
      )
      .join('\n')
    const confirmation = await vscode.window.showWarningMessage(
      `This will create ${new_files.length} new ${
        new_files.length == 1 ? 'file' : 'files'
      }:\n${new_file_list}\n\nDo you want to continue?`,
      { modal: true },
      'Yes'
    )

    if (confirmation != 'Yes') {
      vscode.window.showInformationMessage(
        'Operation cancelled. No files were modified.'
      )
      Logger.log({
        function_name: 'handle_intelligent_update',
        message: 'User cancelled new file creation in multi-file mode.'
      })
      return null
    }
    Logger.log({
      function_name: 'handle_intelligent_update',
      message: 'User confirmed new file creation in multi-file mode.'
    })
  }

  // Update the message to accurately reflect what's happening
  let progress_title = ''
  if (existing_files.length > 0 && new_files.length > 0) {
    progress_title = `Updating ${existing_files.length} file${
      existing_files.length > 1 ? 's' : ''
    } and creating ${new_files.length} new file${
      new_files.length > 1 ? 's' : ''
    }`
  } else if (existing_files.length > 0) {
    progress_title = `Updating ${existing_files.length} file${
      existing_files.length > 1 ? 's' : ''
    }...`
  } else {
    progress_title = `Creating ${new_files.length} new file${
      new_files.length > 1 ? 's' : ''
    }`
  }

  // Store original file states for reversion
  const original_states: OriginalFileState[] = []
  let operation_successful = false

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

      type DocumentChange = {
        document: vscode.TextDocument | null // Null for new files
        content: string // New content from AI or clipboard
        isNew: boolean
        filePath: string
        workspaceName?: string
      }
      const document_changes: DocumentChange[] = []

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
            continue // Skip this file if path is invalid
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
            // Continue with other files, but this one might cause issues later
          }
        }

        // Mark new files for reversion tracking
        for (const file of new_files) {
          original_states.push({
            file_path: file.file_path,
            content: '', // Original content is empty
            is_new: true,
            workspace_name: file.workspace_name
          })
        }

        // Process all files in parallel batches
        for (let i = 0; i < files.length; i += MAX_CONCURRENCY) {
          if (token.isCancellationRequested) {
            Logger.log({
              function_name: 'handle_intelligent_update',
              message: 'Operation cancelled during batching.',
              data: { batch_start_index: i }
            })
            throw new Error('Operation cancelled')
          }

          const batch = files.slice(i, i + MAX_CONCURRENCY)
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

            // For new files, just store the information for creation later
            if (!file_exists) {
              return {
                document: null,
                content: file.content, // Use clipboard content directly
                isNew: true,
                filePath: file.file_path,
                workspaceName: file.workspace_name
              }
            }

            // For existing files, process with AI
            try {
              const file_uri = vscode.Uri.file(safe_path)
              const document = await vscode.workspace.openTextDocument(file_uri)
              const document_text = document.getText() // Get current text

              // Find original state for this file (should exist)
              const original_state = original_states.find(
                (s) =>
                  s.file_path == file.file_path &&
                  s.workspace_name == file.workspace_name &&
                  !s.is_new
              )
              const original_content_for_api = original_state
                ? original_state.content
                : document_text // Use stored original if available

              const updated_content_result = await process_file({
                endpoint_url: params.endpoint_url,
                api_key: params.api_key,
                model: params.model,
                file_path: file.file_path,
                file_content: original_content_for_api, // Send original content to AI
                instruction: file.content, // Clipboard content is the instruction
                cancel_token: cancel_token_source.token,
                on_progress: (receivedLength, totalLength) => {
                  if (
                    largest_file &&
                    file.file_path == largest_file.path &&
                    file.workspace_name == largest_file.workspaceName
                  ) {
                    previous_largest_file_progress = largest_file_progress
                    largest_file_progress = Math.min(
                      Math.round((receivedLength / totalLength) * 100),
                      100
                    )
                    const increment =
                      largest_file_progress - previous_largest_file_progress
                    progress.report({
                      increment: increment > 0 ? increment : 0
                    })
                  }
                }
              })

              if (token.isCancellationRequested)
                throw new Error('Operation cancelled')

              // If process_file returned null (due to error, cancellation, or rate limit)
              if (!updated_content_result) {
                throw new Error(`Failed to apply changes to ${file.file_path}`)
              }

              // No rate limit fallback needed, just use the result
              const final_content = updated_content_result // Already cleaned in process_file

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

          // Wait for all promises in this batch
          const results = await Promise.all(promises)
          document_changes.push(...results)
        }

        for (const change of document_changes) {
          if (token.isCancellationRequested)
            throw new Error('Operation cancelled')

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
            continue // Skip applying this change
          }

          if (change.isNew) {
            const created = await create_file_if_needed(
              change.filePath,
              change.content,
              change.workspaceName
            )
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
            // Apply changes to existing file
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
                    document.positionAt(document.getText().length) // Use current length for replacement range
                  ),
                  change.content // Apply the AI-generated content
                )
              })
              await format_document(document)
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
              // Continue applying other changes
            }
          }
        }

        operation_successful = true // Mark as successful if all applies finished (or were skipped gracefully)
      } catch (error: any) {
        cancel_token_source.cancel('Operation failed due to error.') // Cancel any pending requests
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
        // Do not set operation_successful = true
      }
    }
  )

  return operation_successful ? original_states : null
}
