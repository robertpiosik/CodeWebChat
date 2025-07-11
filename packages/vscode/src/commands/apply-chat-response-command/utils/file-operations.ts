import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { create_safe_path } from '../../../utils/path-sanitizer'
import { Logger } from '../../../utils/logger'
import { format_document } from './format-document'
import { OriginalFileState } from '../../../types/common'

export async function create_file_if_needed(
  filePath: string,
  content: string,
  workspace_name?: string
): Promise<boolean> {
  Logger.log({
    function_name: 'create_file_if_needed',
    message: 'start',
    data: { filePath, workspace_name }
  })
  // Check if we have workspace folder(s)
  if (
    !vscode.workspace.workspaceFolders ||
    vscode.workspace.workspaceFolders.length == 0
  ) {
    vscode.window.showErrorMessage('No workspace folder open.')
    Logger.warn({
      function_name: 'create_file_if_needed',
      message: 'No workspace folder open.'
    })
    return false
  }

  let workspace_folder_path: string | undefined

  if (workspace_name) {
    const target_workspace = vscode.workspace.workspaceFolders.find(
      (folder) => folder.name == workspace_name
    )
    if (target_workspace) {
      workspace_folder_path = target_workspace.uri.fsPath
    } else {
      Logger.warn({
        function_name: 'create_file_if_needed',
        message: `Workspace named "${workspace_name}" not found. Falling back to the first workspace.`,
        data: filePath
      })
      // Fallback to the first workspace if the named one isn't found
      workspace_folder_path = vscode.workspace.workspaceFolders[0].uri.fsPath
    }
  } else {
    // Default to the first workspace if no name is provided
    workspace_folder_path = vscode.workspace.workspaceFolders[0].uri.fsPath
  }

  const safe_path = create_safe_path(workspace_folder_path, filePath)

  if (!safe_path) {
    vscode.window.showErrorMessage(
      `Invalid file path: ${filePath}. Path may contain traversal attempts.`
    )
    Logger.error({
      function_name: 'create_file_if_needed',
      message: 'Invalid file path',
      data: filePath
    })
    return false
  }

  // Ensure directory exists
  const directory = path.dirname(safe_path)
  if (!fs.existsSync(directory)) {
    try {
      fs.mkdirSync(directory, { recursive: true })
      Logger.log({
        function_name: 'create_file_if_needed',
        message: 'Directory created',
        data: directory
      })
    } catch (error) {
      Logger.error({
        function_name: 'create_file_if_needed',
        message: 'Failed to create directory',
        data: { directory, error }
      })
      vscode.window.showErrorMessage(`Failed to create directory: ${directory}`)
      return false
    }
  }

  // Create the file
  try {
    fs.writeFileSync(safe_path, content)
    Logger.log({
      function_name: 'create_file_if_needed',
      message: 'File created',
      data: safe_path
    })
  } catch (error) {
    Logger.error({
      function_name: 'create_file_if_needed',
      message: 'Failed to write file',
      data: { safe_path, error }
    })
    vscode.window.showErrorMessage(`Failed to write file: ${safe_path}`)
    return false
  }

  // Open the file in editor
  try {
    const document = await vscode.workspace.openTextDocument(safe_path)
    await vscode.window.showTextDocument(document)

    await format_document(document)
    await document.save()
    Logger.log({
      function_name: 'create_file_if_needed',
      message: 'File created, formatted and saved',
      data: safe_path
    })
    return true
  } catch (error) {
    Logger.error({
      function_name: 'create_file_if_needed',
      message: 'Failed to open, format, or save file',
      data: { safe_path, error }
    })
    vscode.window.showErrorMessage(
      `Failed to open, format, or save file: ${safe_path}`
    )
    return false // Indicate failure but the file might still exist
  }
}

/**
 * Reverts applied changes to files based on their original states.
 */
export async function revert_files(
  original_states: OriginalFileState[],
  show_message = true
): Promise<boolean> {
  Logger.log({
    function_name: 'revert_files',
    message: 'start',
    data: { original_states_count: original_states.length }
  })
  try {
    if (
      !vscode.workspace.workspaceFolders ||
      vscode.workspace.workspaceFolders.length === 0
    ) {
      vscode.window.showErrorMessage('No workspace folder open.')
      Logger.warn({
        function_name: 'revert_files',
        message: 'No workspace folder open.'
      })
      return false
    }

    // Create a map of workspace names to their root paths
    const workspace_map = new Map<string, string>()
    vscode.workspace.workspaceFolders.forEach((folder) => {
      workspace_map.set(folder.name, folder.uri.fsPath)
    })

    // Default workspace is the first one
    const default_workspace = vscode.workspace.workspaceFolders[0].uri.fsPath

    for (const state of original_states) {
      // Determine the correct workspace root for this file
      let workspace_root = default_workspace
      if (state.workspace_name && workspace_map.has(state.workspace_name)) {
        workspace_root = workspace_map.get(state.workspace_name)!
      } else if (state.workspace_name) {
        Logger.warn({
          function_name: 'revert_files',
          message: `Workspace '${state.workspace_name}' not found for file '${state.file_path}'. Using default.`
        })
      }

      // Validate the file path for reversion
      const safe_path = create_safe_path(workspace_root, state.file_path)

      if (!safe_path) {
        Logger.error({
          function_name: 'revert_files',
          message: 'Cannot revert file with unsafe path',
          data: state.file_path
        })
        console.error(`Cannot revert file with unsafe path: ${state.file_path}`)
        continue // Skip this file
      }

      // For new files that were created, delete them
      if (state.is_new) {
        if (fs.existsSync(safe_path)) {
          // Close any editors with the file open
          const uri = vscode.Uri.file(safe_path)
          // Try to close the editor if it's open
          const text_editors = vscode.window.visibleTextEditors.filter(
            (editor) => editor.document.uri.toString() === uri.toString()
          )
          for (const editor of text_editors) {
            await vscode.window.showTextDocument(editor.document, {
              preview: false,
              preserveFocus: false
            })
            await vscode.commands.executeCommand(
              'workbench.action.closeActiveEditor'
            )
          }

          // Delete the file
          try {
            fs.unlinkSync(safe_path)
            Logger.log({
              function_name: 'revert_files',
              message: 'New file deleted',
              data: safe_path
            })
          } catch (err) {
            Logger.error({
              function_name: 'revert_files',
              message: 'Error deleting new file',
              data: { error: err, file_path: state.file_path }
            })
            vscode.window.showWarningMessage(
              `Could not delete file: ${state.file_path}.`
            )
          }
        }
      } else {
        // For existing files that were modified, restore original content.
        // This also handles files that were deleted (by recreating them).
        if (!fs.existsSync(safe_path)) {
          try {
            const dir = path.dirname(safe_path)
            if (!fs.existsSync(dir)) {
              fs.mkdirSync(dir, { recursive: true })
            }
            fs.writeFileSync(safe_path, state.content)
            Logger.log({
              function_name: 'revert_files',
              message: 'Recreated deleted file.',
              data: { file_path: state.file_path }
            })
            const doc = await vscode.workspace.openTextDocument(safe_path)
            await vscode.window.showTextDocument(doc)
            await format_document(doc)
            await doc.save()
          } catch (err) {
            Logger.warn({
              function_name: 'revert_files',
              message: 'Error recreating deleted file',
              data: { error: err, file_path: state.file_path }
            })
            vscode.window.showWarningMessage(
              `Could not recreate file: ${state.file_path}.`
            )
          }
        } else {
          // For existing files that were modified, restore original content
          const file_uri = vscode.Uri.file(safe_path)

          try {
            const document = await vscode.workspace.openTextDocument(file_uri)
            const editor = await vscode.window.showTextDocument(document)
            await editor.edit((edit) => {
              edit.replace(
                new vscode.Range(
                  document.positionAt(0),
                  document.positionAt(document.getText().length)
                ),
                state.content
              )
            })
            await document.save()
            Logger.log({
              function_name: 'revert_files',
              message: 'Existing file reverted to original content',
              data: safe_path
            })
          } catch (err) {
            Logger.warn({
              function_name: 'revert_files',
              message: 'Error reverting file',
              data: { error: err, file_path: state.file_path }
            })
            console.error(`Error reverting file ${state.file_path}:`, err)
            vscode.window.showWarningMessage(
              `Could not revert file: ${state.file_path}. It might have been closed or deleted.`
            )
          }
        }
      }
    }

    if (show_message) {
      vscode.window.showInformationMessage('Changes successfully reverted.')
    }
    Logger.log({
      function_name: 'revert_files',
      message: 'Changes successfully reverted.'
    })
    return true
  } catch (error: any) {
    Logger.error({
      function_name: 'revert_files',
      message: 'Error during reversion',
      data: error
    })
    console.error('Error during reversion:', error)
    vscode.window.showErrorMessage(
      `Failed to revert changes: ${error.message || 'Unknown error'}`
    )
    return false
  }
}
