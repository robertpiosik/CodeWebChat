import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { Logger } from '../../../utils/logger'
import {
  create_safe_path,
  sanitize_file_name
} from '../../../utils/path-sanitizer'
import { format_document } from '../utils/format-document'
import { ClipboardFile } from '../utils/clipboard-parser'
import { OriginalFileState } from '../../../types/common'

export async function handle_fast_replace(
  files: ClipboardFile[]
): Promise<{ success: boolean; original_states?: OriginalFileState[] }> {
  Logger.log({
    function_name: 'handle_fast_replace',
    message: 'start',
    data: { file_count: files.length }
  })
  try {
    const new_files: ClipboardFile[] = []
    const existing_files: ClipboardFile[] = []
    const safe_files: ClipboardFile[] = []
    const unsafe_files: string[] = []

    if (
      !vscode.workspace.workspaceFolders ||
      vscode.workspace.workspaceFolders.length == 0
    ) {
      vscode.window.showErrorMessage('No workspace folder open.')
      Logger.warn({
        function_name: 'handle_fast_replace',
        message: 'No workspace folder open.'
      })
      return { success: false }
    }

    // Create a map of workspace names to their root paths
    const workspace_map = new Map<string, string>()
    vscode.workspace.workspaceFolders.forEach((folder) => {
      workspace_map.set(folder.name, folder.uri.fsPath)
    })

    // Default workspace is the first one
    const default_workspace = vscode.workspace.workspaceFolders[0].uri.fsPath

    // First validate all file paths
    for (const file of files) {
      // Determine the correct workspace root
      let workspace_root = default_workspace
      if (file.workspace_name && workspace_map.has(file.workspace_name)) {
        workspace_root = workspace_map.get(file.workspace_name)!
      } else if (file.workspace_name) {
        Logger.warn({
          function_name: 'handle_fast_replace',
          message: `Workspace '${file.workspace_name}' not found for file '${file.file_path}'. Using default.`
        })
      }

      const sanitized_path = sanitize_file_name(file.file_path)

      // Check if the path would be safe
      if (create_safe_path(workspace_root, sanitized_path)) {
        safe_files.push({
          ...file,
          file_path: sanitized_path // Use sanitized path
        })
      } else {
        unsafe_files.push(file.file_path)
        Logger.warn({
          function_name: 'handle_fast_replace',
          message: 'Unsafe file path detected',
          data: file.file_path
        })
      }
    }

    if (unsafe_files.length > 0) {
      const unsafe_list = unsafe_files.join('\n')
      vscode.window.showErrorMessage(
        `Detected ${unsafe_files.length} unsafe file path(s) that may attempt directory traversal:\n${unsafe_list}\n\nThese files will be skipped.`
      )
      Logger.warn({
        function_name: 'handle_fast_replace',
        message: 'Unsafe file paths detected and skipped',
        data: unsafe_files
      })

      if (safe_files.length == 0) {
        return { success: false }
      }
    }

    // Check existence for each file in its correct workspace
    for (const file of safe_files) {
      let workspace_root = default_workspace
      if (file.workspace_name && workspace_map.has(file.workspace_name)) {
        workspace_root = workspace_map.get(file.workspace_name)!
      }

      const full_path = path.normalize(
        path.join(workspace_root, file.file_path)
      )

      if (fs.existsSync(full_path)) {
        existing_files.push(file)
      } else {
        new_files.push(file)
      }
    }

    // If there are new files, ask for confirmation before proceeding
    if (new_files.length > 0) {
      const new_file_list = new_files.map((file) => file.file_path).join('\n')
      const confirmation = await vscode.window.showWarningMessage(
        `This will create ${new_files.length} new ${
          new_files.length === 1 ? 'file' : 'files'
        }:\n${new_file_list}\n\nDo you want to continue?`,
        { modal: true },
        'Yes'
      )

      if (confirmation != 'Yes') {
        vscode.window.showInformationMessage(
          'Operation cancelled. No files were modified.'
        )
        Logger.log({
          function_name: 'handle_fast_replace',
          message: 'User cancelled new file creation.'
        })
        return { success: false }
      }
      Logger.log({
        function_name: 'handle_fast_replace',
        message: 'User confirmed new file creation.'
      })
    }

    // Store original file states for reversion
    const original_states: OriginalFileState[] = []

    // Process all files without progress reporting
    for (const file of safe_files) {
      let workspace_root = default_workspace
      if (file.workspace_name && workspace_map.has(file.workspace_name)) {
        workspace_root = workspace_map.get(file.workspace_name)!
      }

      const safe_path = create_safe_path(workspace_root, file.file_path)

      if (!safe_path) {
        Logger.error({
          function_name: 'handle_fast_replace',
          message: 'Path validation failed',
          data: file.file_path
        })
        console.error(`Path validation failed for: ${file.file_path}`)
        continue
      }

      const file_exists = fs.existsSync(safe_path)

      try {
        if (file_exists) {
          // Store original content for reversion
          const file_uri = vscode.Uri.file(safe_path)
          const document = await vscode.workspace.openTextDocument(file_uri)
          original_states.push({
            file_path: file.file_path,
            content: document.getText(),
            is_new: false,
            workspace_name: file.workspace_name
          })

          // Replace existing file
          const editor = await vscode.window.showTextDocument(document)
          await editor.edit((edit) => {
            edit.replace(
              new vscode.Range(
                document.positionAt(0),
                document.positionAt(document.getText().length)
              ),
              file.content
            )
          })

          await format_document(document)
          await document.save()
          Logger.log({
            function_name: 'handle_fast_replace',
            message: 'Existing file replaced and saved',
            data: safe_path
          })
        } else {
          // Mark as new file for reversion
          original_states.push({
            file_path: file.file_path,
            content: '',
            is_new: true,
            workspace_name: file.workspace_name
          })

          // Create new file in correct workspace
          const directory = path.dirname(safe_path)
          if (!fs.existsSync(directory)) {
            try {
              fs.mkdirSync(directory, { recursive: true })
              Logger.log({
                function_name: 'handle_fast_replace',
                message: 'Directory created',
                data: directory
              })
            } catch (error) {
              Logger.error({
                function_name: 'handle_fast_replace',
                message: 'Failed to create directory',
                data: { directory, error, file_path: file.file_path }
              })
              vscode.window.showErrorMessage(
                `Failed to create directory for: ${file.file_path}`
              )
              continue
            }
          }

          try {
            fs.writeFileSync(safe_path, file.content)
            Logger.log({
              function_name: 'handle_fast_replace',
              message: 'New file created',
              data: safe_path
            })
          } catch (error) {
            Logger.error({
              function_name: 'handle_fast_replace',
              message: 'Failed to write new file',
              data: { safe_path, error, file_path: file.file_path }
            })
            vscode.window.showErrorMessage(
              `Failed to write file: ${file.file_path}`
            )
            continue
          }

          try {
            const document = await vscode.workspace.openTextDocument(safe_path)
            await vscode.window.showTextDocument(document)
            await format_document(document)
            await document.save()
            Logger.log({
              function_name: 'handle_fast_replace',
              message: 'New file created, formatted and saved',
              data: safe_path
            })
          } catch (error) {
            Logger.error({
              function_name: 'handle_fast_replace',
              message: 'Failed to open/format/save new file',
              data: { safe_path, error, file_path: file.file_path }
            })
            vscode.window.showErrorMessage(
              `Failed to open/format/save new file: ${file.file_path}`
            )
          }
        }
      } catch (error: any) {
        Logger.error({
          function_name: 'handle_fast_replace',
          message: 'Error processing file during replacement',
          data: { error, file_path: file.file_path }
        })
        vscode.window.showErrorMessage(
          `Error processing file ${file.file_path}: ${
            error.message || 'Unknown error'
          }`
        )
        continue
      }
    }

    Logger.log({
      function_name: 'handle_fast_replace',
      message: 'Files replaced successfully',
      data: { file_count: safe_files.length }
    })
    return { success: true, original_states }
  } catch (error: any) {
    Logger.error({
      function_name: 'handle_fast_replace',
      message: 'Error during direct file replacement',
      data: error
    })
    console.error('Error during direct file replacement:', error)
    vscode.window.showErrorMessage(
      `An error occurred while replacing files: ${
        error.message || 'Unknown error'
      }`
    )
    return { success: false }
  }
}
