import * as vscode from 'vscode'
import * as path from 'path'
import { Logger } from '@shared/utils/logger'
import { t } from '@/i18n'
import { OriginalFileState } from '@/commands/apply-response-command/types/original-file-state'
import { create_safe_path } from '@/utils/path-sanitizer'
import { uri_exists } from './uri-exists'
import { remove_directory_if_empty } from './remove-directory-if-empty'
import { relocate_file } from './relocate-file'

export const undo_files = async (params: {
  original_states: OriginalFileState[]
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
      vscode.window.showErrorMessage(
        t('command.apply-response.error.no-workspace-folder')
      )
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
        continue
      }
      let file_uri = vscode.Uri.file(safe_path)

      if (state.file_state == 'new' && !state.file_path_to_restore) {
        if (await uri_exists(file_uri)) {
          const text_editors = vscode.window.visibleTextEditors.filter(
            (editor) => editor.document.uri.toString() === file_uri.toString()
          )

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
            await vscode.workspace.fs.delete(file_uri)
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
              t('command.apply-response.warning.could-not-delete-file', {
                path: state.file_path
              })
            )
          }
        }
      } else {
        let file_was_relocated = false
        if (state.file_path_to_restore) {
          let restore_workspace_root = default_workspace
          if (
            state.restore_workspace_name &&
            workspace_map.has(state.restore_workspace_name)
          ) {
            restore_workspace_root = workspace_map.get(
              state.restore_workspace_name
            )!
          }

          if (safe_path && (await uri_exists(vscode.Uri.file(safe_path)))) {
            await relocate_file({
              old_path: state.file_path,
              new_path: state.file_path_to_restore,
              old_workspace_root: workspace_root,
              new_workspace_root: restore_workspace_root
            })
            file_was_relocated = true
          }
          safe_path = create_safe_path(
            restore_workspace_root,
            state.file_path_to_restore
          )
        }
        if (!safe_path) continue
        file_uri = vscode.Uri.file(safe_path)
        if (!(await uri_exists(file_uri))) {
          try {
            const dir_uri = vscode.Uri.file(path.dirname(safe_path))
            if (!(await uri_exists(dir_uri))) {
              await vscode.workspace.fs.createDirectory(dir_uri)
            }
            await vscode.workspace.fs.writeFile(
              file_uri,
              Buffer.from(state.content, 'utf8')
            )

            Logger.info({
              function_name: 'undo_files',
              message: 'Recreated deleted file.',
              data: { file_path: state.file_path }
            })
            const document = await vscode.workspace.openTextDocument(safe_path)
            await vscode.window.showTextDocument(document, { preview: false })
          } catch (err) {
            Logger.warn({
              function_name: 'undo_files',
              message: 'Error recreating deleted file',
              data: { error: err, file_path: state.file_path }
            })
            vscode.window.showWarningMessage(
              t('command.apply-response.warning.could-not-recreate-file', {
                path: state.file_path
              })
            )
          }
        } else {
          try {
            const editor = !file_was_relocated
              ? vscode.window.visibleTextEditors.find(
                  (e) => e.document.uri.fsPath == safe_path
                )
              : undefined
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
              await vscode.workspace.fs.writeFile(
                file_uri,
                Buffer.from(state.content, 'utf8')
              )
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
              t('command.apply-response.warning.could-not-undo-file', {
                path: state.file_path
              })
            )
          }
        }
      }
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
      t('command.apply-response.error.failed-to-undo', {
        msg: error.message || 'Unknown error'
      })
    )
    return false
  }
}
