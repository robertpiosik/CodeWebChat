import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { Logger } from '@shared/utils/logger'
import { dictionary } from '@shared/constants/dictionary'
import { create_safe_path } from '@/utils/path-sanitizer'
import { OriginalFileState } from '../types/original-file-state'
import { FileInPreview } from '@shared/types/file-in-preview'
import { remove_directory_if_empty } from '../utils/file-operations'

export const handle_restore_preview = async (
  files: FileInPreview[]
): Promise<{ success: boolean; original_states?: OriginalFileState[] }> => {
  Logger.info({
    function_name: 'handle_restore_review',
    message: 'start',
    data: { file_count: files.length }
  })

  if (
    !vscode.workspace.workspaceFolders ||
    vscode.workspace.workspaceFolders.length == 0
  ) {
    vscode.window.showErrorMessage(
      dictionary.error_message.NO_WORKSPACE_FOLDER_OPEN
    )
    Logger.warn({
      function_name: 'handle_restore_review',
      message: 'No workspace folder open.'
    })
    return { success: false }
  }

  const workspace_map = new Map<string, string>()
  vscode.workspace.workspaceFolders.forEach((folder) => {
    workspace_map.set(folder.name, folder.uri.fsPath)
  })
  const default_workspace = vscode.workspace.workspaceFolders[0].uri.fsPath

  const original_states: OriginalFileState[] = []

  for (const file of files) {
    let workspace_root = default_workspace
    if (file.workspace_name && workspace_map.has(file.workspace_name)) {
      workspace_root = workspace_map.get(file.workspace_name)!
    } else if (file.workspace_name) {
      Logger.warn({
        function_name: 'handle_restore_review',
        message: `Workspace '${file.workspace_name}' not found for file '${file.file_path}'. Using default.`
      })
    }

    const safe_path = create_safe_path(workspace_root, file.file_path)

    if (!safe_path) {
      Logger.warn({
        function_name: 'handle_restore_review',
        message: 'Unsafe file path detected and skipped',
        data: file.file_path
      })
      continue
    }

    const file_exists = fs.existsSync(safe_path)
    let original_content = ''
    if (file_exists) {
      try {
        const document = await vscode.workspace.openTextDocument(safe_path)
        original_content = document.getText()
      } catch (e) {
        Logger.warn({
          function_name: 'handle_restore_review',
          message: 'Could not read original content of file',
          data: { file_path: safe_path, error: e }
        })
      }
    }

    original_states.push({
      file_path: file.file_path,
      content: original_content,
      is_new: !file_exists,
      workspace_name: file.workspace_name,
      is_deleted: file.is_deleted,
      is_checked: file.is_checked,
      is_replaced: file.is_replaced,
      diff_application_method: file.diff_application_method
    })

    if (file.is_checked !== false) {
      if (file.is_deleted) {
        if (file_exists) {
          try {
            const tabs_to_close: vscode.Tab[] = []
            for (const tab_group of vscode.window.tabGroups.all) {
              tabs_to_close.push(
                ...tab_group.tabs.filter((tab) => {
                  const tab_uri = (tab.input as any)?.uri as
                    | vscode.Uri
                    | undefined
                  return tab_uri && tab_uri.fsPath === safe_path
                })
              )
            }

            if (tabs_to_close.length > 0) {
              await vscode.window.tabGroups.close(tabs_to_close)
            }

            fs.unlinkSync(safe_path)
            Logger.info({
              function_name: 'handle_restore_review',
              message: 'File deleted',
              data: safe_path
            })
            await remove_directory_if_empty({
              dir_path: path.dirname(safe_path),
              workspace_root
            })
          } catch (error) {
            Logger.error({
              function_name: 'handle_restore_review',
              message: 'Error deleting file',
              data: { safe_path, error }
            })
            vscode.window.showErrorMessage(
              `Failed to delete file: ${file.file_path}`
            )
          }
        }
      } else if (file.content !== undefined) {
        if (file_exists) {
          try {
            const file_uri = vscode.Uri.file(safe_path)
            const document = await vscode.workspace.openTextDocument(file_uri)
            const editor = await vscode.window.showTextDocument(document)
            let final_content = file.content
            if (
              original_content.endsWith('\n') &&
              !final_content.endsWith('\n')
            ) {
              final_content += '\n'
            }
            await editor.edit((edit) => {
              edit.replace(
                new vscode.Range(
                  document.positionAt(0),
                  document.positionAt(document.getText().length)
                ),
                final_content
              )
            })

            await document.save()
            Logger.info({
              function_name: 'handle_restore_review',
              message: 'Existing file replaced and saved',
              data: safe_path
            })
          } catch (error) {
            Logger.error({
              function_name: 'handle_restore_review',
              message: 'Error updating file',
              data: { safe_path, error }
            })
            vscode.window.showErrorMessage(
              `Failed to update file: ${file.file_path}`
            )
          }
        } else {
          const directory = path.dirname(safe_path)
          if (!fs.existsSync(directory)) {
            try {
              fs.mkdirSync(directory, { recursive: true })
              Logger.info({
                function_name: 'handle_restore_review',
                message: 'Directory created',
                data: directory
              })
            } catch (error) {
              Logger.error({
                function_name: 'handle_restore_review',
                message: 'Failed to create directory',
                data: { directory, error, file_path: file.file_path }
              })
              vscode.window.showErrorMessage(
                dictionary.error_message.FAILED_TO_CREATE_DIRECTORY(
                  file.file_path
                )
              )
              continue
            }
          }

          try {
            fs.writeFileSync(safe_path, file.content)
            Logger.info({
              function_name: 'handle_restore_review',
              message: 'New file created',
              data: safe_path
            })
            const document = await vscode.workspace.openTextDocument(safe_path)
            await vscode.window.showTextDocument(document, { preview: false })
          } catch (error) {
            Logger.error({
              function_name: 'handle_restore_review',
              message: 'Failed to write new file',
              data: { safe_path, error, file_path: file.file_path }
            })
            vscode.window.showErrorMessage(
              dictionary.error_message.FAILED_TO_WRITE_FILE(file.file_path)
            )
            continue
          }
        }
      }
    }
  }

  return { success: true, original_states }
}
