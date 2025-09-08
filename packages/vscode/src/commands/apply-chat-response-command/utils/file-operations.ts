import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { create_safe_path } from '@/utils/path-sanitizer'
import { Logger } from '@shared/utils/logger'
import { OriginalFileState } from '@/commands/apply-chat-response-command/types/original-file-state'

export const remove_directory_if_empty = async (params: {
  dir_path: string
  workspace_root: string
}) => {
  const normalized_dir = path.normalize(params.dir_path)
  const normalized_root = path.normalize(params.workspace_root)

  if (
    !normalized_dir ||
    !normalized_dir.startsWith(normalized_root) ||
    normalized_dir == normalized_root
  ) {
    return
  }

  try {
    if (
      fs.existsSync(normalized_dir) &&
      fs.lstatSync(normalized_dir).isDirectory()
    ) {
      const files = fs.readdirSync(normalized_dir)
      if (files.length == 0) {
        fs.rmdirSync(normalized_dir)
        Logger.info({
          function_name: 'remove_directory_if_empty',
          message: 'Removed empty directory',
          data: { dir_path: normalized_dir }
        })
        await remove_directory_if_empty({
          dir_path: path.dirname(normalized_dir),
          workspace_root: params.workspace_root
        })
      }
    }
  } catch (error) {
    Logger.error({
      function_name: 'remove_directory_if_empty',
      message: 'Error removing empty directory',
      data: { error, dir_path: normalized_dir }
    })
  }
}

export const create_file_if_needed = async (params: {
  file_path: string
  content: string
  workspace_name?: string
}): Promise<boolean> => {
  Logger.info({
    function_name: 'create_file_if_needed',
    message: 'start',
    data: { filePath: params.file_path, workspace_name: params.workspace_name }
  })
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

  if (params.workspace_name) {
    const target_workspace = vscode.workspace.workspaceFolders.find(
      (folder) => folder.name == params.workspace_name
    )
    if (target_workspace) {
      workspace_folder_path = target_workspace.uri.fsPath
    } else {
      Logger.warn({
        function_name: 'create_file_if_needed',
        message: `Workspace named "${params.workspace_name}" not found. Falling back to the first workspace.`,
        data: params.file_path
      })
      workspace_folder_path = vscode.workspace.workspaceFolders[0].uri.fsPath
    }
  } else {
    workspace_folder_path = vscode.workspace.workspaceFolders[0].uri.fsPath
  }

  const safe_path = create_safe_path(workspace_folder_path, params.file_path)

  if (!safe_path) {
    vscode.window.showErrorMessage(
      `Invalid file path: ${params.file_path}. Path may contain traversal attempts.`
    )
    Logger.error({
      function_name: 'create_file_if_needed',
      message: 'Invalid file path',
      data: params.file_path
    })
    return false
  }

  const directory = path.dirname(safe_path)
  if (!fs.existsSync(directory)) {
    try {
      fs.mkdirSync(directory, { recursive: true })
      Logger.info({
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

  try {
    fs.writeFileSync(safe_path, params.content)
    Logger.info({
      function_name: 'create_file_if_needed',
      message: 'File created',
      data: safe_path
    })
    return true
  } catch (error) {
    Logger.error({
      function_name: 'create_file_if_needed',
      message: 'Failed to write file',
      data: { safe_path, error }
    })
    vscode.window.showErrorMessage(`Failed to write file: ${safe_path}`)
  }
  return false
}

const relocate_file = async (params: {
  old_path: string
  new_path: string
  workspace_root: string
}): Promise<boolean> => {
  try {
    const old_safe_path = create_safe_path(
      params.workspace_root,
      params.old_path
    )
    const new_safe_path = create_safe_path(
      params.workspace_root,
      params.new_path
    )

    if (!old_safe_path || !new_safe_path) {
      Logger.error({
        function_name: 'relocate_file',
        message: 'Invalid file paths for relocation',
        data: { old_path: params.old_path, new_path: params.new_path }
      })
      return false
    }

    if (!fs.existsSync(old_safe_path)) {
      Logger.warn({
        function_name: 'relocate_file',
        message: 'Source file does not exist for relocation',
        data: { old_path: old_safe_path }
      })
      return false
    }

    // Create directory for new path if needed
    const new_dir = path.dirname(new_safe_path)
    if (!fs.existsSync(new_dir)) {
      fs.mkdirSync(new_dir, { recursive: true })
    }

    // Close any open editors for the old file
    const old_uri = vscode.Uri.file(old_safe_path)
    const text_editors = vscode.window.visibleTextEditors.filter(
      (editor) => editor.document.uri.toString() == old_uri.toString()
    )
    for (const editor of text_editors) {
      await vscode.window.showTextDocument(editor.document, {
        preview: false,
        preserveFocus: false
      })
      await vscode.commands.executeCommand('workbench.action.closeActiveEditor')
    }

    // Move the file
    fs.renameSync(old_safe_path, new_safe_path)

    // Clean up empty directory if needed
    await remove_directory_if_empty({
      dir_path: path.dirname(old_safe_path),
      workspace_root: params.workspace_root
    })

    // Open the file at new location
    const document = await vscode.workspace.openTextDocument(new_safe_path)
    await vscode.window.showTextDocument(document)

    Logger.info({
      function_name: 'relocate_file',
      message: 'File successfully relocated',
      data: { old_path: old_safe_path, new_path: new_safe_path }
    })

    return true
  } catch (error) {
    Logger.error({
      function_name: 'relocate_file',
      message: 'Error relocating file',
      data: { error, old_path: params.old_path, new_path: params.new_path }
    })
    return false
  }
}

export const apply_file_relocations = async (
  original_states: OriginalFileState[]
): Promise<void> => {
  if (
    !vscode.workspace.workspaceFolders ||
    vscode.workspace.workspaceFolders.length === 0
  ) {
    return
  }

  const workspace_map = new Map<string, string>()
  vscode.workspace.workspaceFolders.forEach((folder) => {
    workspace_map.set(folder.name, folder.uri.fsPath)
  })

  const default_workspace = vscode.workspace.workspaceFolders[0].uri.fsPath

  for (const state of original_states) {
    if (state.new_file_path && state.new_file_path !== state.file_path) {
      let workspace_root = default_workspace
      if (state.workspace_name && workspace_map.has(state.workspace_name)) {
        workspace_root = workspace_map.get(state.workspace_name)!
      }

      const success = await relocate_file({
        old_path: state.file_path,
        new_path: state.new_file_path,
        workspace_root
      })

      if (success) {
        state.file_path_to_restore = state.file_path
        state.file_path = state.new_file_path
        state.new_file_path = undefined
      }
    }
  }
}

export const undo_files = async (params: {
  original_states: OriginalFileState[]
  show_message?: boolean
}): Promise<boolean> => {
  Logger.info({
    function_name: 'undo_files',
    message: 'start',
    data: { original_states_count: params.original_states.length }
  })
  try {
    if (
      !vscode.workspace.workspaceFolders ||
      vscode.workspace.workspaceFolders.length == 0
    ) {
      vscode.window.showErrorMessage('No workspace folder open.')
      Logger.warn({
        function_name: 'undo_files',
        message: 'No workspace folder open.'
      })
      return false
    }

    const workspace_map = new Map<string, string>()
    vscode.workspace.workspaceFolders.forEach((folder) => {
      workspace_map.set(folder.name, folder.uri.fsPath)
    })

    const default_workspace = vscode.workspace.workspaceFolders[0].uri.fsPath

    for (const state of params.original_states) {
      let workspace_root = default_workspace
      if (state.workspace_name && workspace_map.has(state.workspace_name)) {
        workspace_root = workspace_map.get(state.workspace_name)!
      } else if (state.workspace_name) {
        Logger.warn({
          function_name: 'undo_files',
          message: `Workspace '${state.workspace_name}' not found for file '${state.file_path}'. Using default.`
        })
      }

      let safe_path = create_safe_path(workspace_root, state.file_path)

      if (!safe_path) {
        Logger.error({
          function_name: 'undo_files',
          message: 'Cannot undo file with unsafe path',
          data: state.file_path
        })
        console.error(`Cannot undo file with unsafe path: ${state.file_path}`)
        continue // Skip this file
      }

      if (state.is_new) {
        if (fs.existsSync(safe_path)) {
          const uri = vscode.Uri.file(safe_path)
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

          try {
            fs.unlinkSync(safe_path)
            Logger.info({
              function_name: 'undo_files',
              message: 'New file deleted',
              data: safe_path
            })
            await remove_directory_if_empty({
              dir_path: path.dirname(safe_path),
              workspace_root
            })
          } catch (err) {
            Logger.error({
              function_name: 'undo_files',
              message: 'Error deleting new file',
              data: { error: err, file_path: state.file_path }
            })
            vscode.window.showWarningMessage(
              `Could not delete file: ${state.file_path}.`
            )
          }
        }
      } else {
        if (state.file_path_to_restore) {
          if (safe_path && fs.existsSync(safe_path)) {
            await relocate_file({
              old_path: state.file_path,
              new_path: state.file_path_to_restore,
              workspace_root
            })
          }
          safe_path = create_safe_path(
            workspace_root,
            state.file_path_to_restore
          )
        }
        if (!safe_path) continue
        // For existing files that were modified, restore original content.
        // This also handles files that were deleted (by recreating them).
        if (!fs.existsSync(safe_path)) {
          try {
            const dir = path.dirname(safe_path)
            if (!fs.existsSync(dir)) {
              fs.mkdirSync(dir, { recursive: true })
            }
            fs.writeFileSync(safe_path, state.content)
            Logger.info({
              function_name: 'undo_files',
              message: 'Recreated deleted file.',
              data: { file_path: state.file_path }
            })
          } catch (err) {
            Logger.warn({
              function_name: 'undo_files',
              message: 'Error recreating deleted file',
              data: { error: err, file_path: state.file_path }
            })
            vscode.window.showWarningMessage(
              `Could not recreate file: ${state.file_path}.`
            )
          }
        } else {
          try {
            const editor = vscode.window.visibleTextEditors.find(
              (e) => e.document.uri.fsPath == safe_path
            )
            if (editor) {
              const document = editor.document
              await editor.edit((edit) => {
                edit.replace(
                  new vscode.Range(
                    document.positionAt(0),
                    document.positionAt(document.getText().length)
                  ),
                  state.content
                )
              })

              if (state.cursor_offset !== undefined) {
                const position = document.positionAt(state.cursor_offset)
                editor.selection = new vscode.Selection(position, position)
              }

              await document.save()
            } else {
              fs.writeFileSync(safe_path, state.content)
            }
            Logger.info({
              function_name: 'undo_files',
              message: 'Existing file content undone to original content',
              data: safe_path
            })
          } catch (err) {
            Logger.warn({
              function_name: 'undo_files',
              message: 'Error undoing file',
              data: { error: err, file_path: state.file_path }
            })
            console.error(`Error undoing file ${state.file_path}:`, err)
            vscode.window.showWarningMessage(
              `Could not undo file: ${state.file_path}. It might have been closed or deleted.`
            )
          }
        }
      }
    }

    if (params.show_message ?? true) {
      vscode.window.showInformationMessage('Changes successfully undone.')
    }
    Logger.info({
      function_name: 'undo_files',
      message: 'Changes successfully undone.'
    })
    return true
  } catch (error: any) {
    Logger.error({
      function_name: 'undo_files',
      message: 'Error during undo',
      data: error
    })
    console.error('Error during undo:', error)
    vscode.window.showErrorMessage(
      `Failed to undo changes: ${error.message || 'Unknown error'}`
    )
    return false
  }
}
