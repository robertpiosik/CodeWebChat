import * as fs from 'fs'
import * as path from 'path'
import * as vscode from 'vscode'
import { create_safe_path } from '../utils/path-sanitizer'
import { Logger } from '@shared/utils/logger'
import { t } from '../i18n'
import { get_error_message } from '@/utils/get-error-message'

export const new_folder_command = () => {
  return vscode.commands.registerCommand(
    'codeWebChat.newFolder',
    async (item?: vscode.TreeItem | vscode.Uri) => {
      let parent_path: string | undefined

      // Handle case when invoked from view/title (no item parameter)
      if (!item) {
        if (
          vscode.workspace.workspaceFolders &&
          vscode.workspace.workspaceFolders.length > 0
        ) {
          parent_path = vscode.workspace.workspaceFolders[0].uri.fsPath
        } else {
          vscode.window.showErrorMessage(
            t('common.error.no-workspace-folder-open')
          )
          return
        }
      }
      // Handle case when invoked with URI (from view/title)
      else if (item instanceof vscode.Uri) {
        parent_path = item.fsPath
      }
      // Handle case when invoked with TreeItem (from context menu)
      else if (item.resourceUri) {
        parent_path = item.resourceUri.fsPath
      }

      if (!parent_path) {
        Logger.error({
          function_name: 'new_folder_command',
          message: 'Could not determine location to create folder.'
        })
        return
      }

      try {
        const stats = fs.statSync(parent_path)
        if (!stats.isDirectory()) {
          // If it's a file, use its parent directory
          parent_path = path.dirname(parent_path)
        }
      } catch (error) {
        // If the path doesn't exist, we'll create it later
      }

      const input_box = vscode.window.createInputBox()
      input_box.title = t('command.new-folder-command.title')
      input_box.prompt = t('common.prompt.enter-name', { item: 'folder' })
      input_box.placeholder = ''

      const close_button = {
        iconPath: new vscode.ThemeIcon('close'),
        tooltip: t('common.close')
      }

      input_box.buttons = [close_button]

      const folder_name = await new Promise<string | undefined>((resolve) => {
        let is_resolved = false

        const disposables: vscode.Disposable[] = []

        disposables.push(
          input_box.onDidTriggerButton((button) => {
            if (button === close_button) {
              resolve(undefined)
              input_box.hide()
            }
          }),
          input_box.onDidAccept(() => {
            is_resolved = true
            resolve(input_box.value.trim())
            input_box.hide()
          }),
          input_box.onDidHide(() => {
            if (!is_resolved) {
              resolve(undefined)
            }
            disposables.forEach((d) => d.dispose())
            input_box.dispose()
          })
        )

        input_box.show()
      })

      if (!folder_name) {
        return
      }

      const is_file_like =
        folder_name.startsWith('.') || path.basename(folder_name).includes('.')

      try {
        const target_path = create_safe_path(parent_path, folder_name)

        if (!target_path) {
          Logger.error({
            function_name: 'new_folder_command',
            message: is_file_like
              ? `Invalid file name: '${folder_name}'.`
              : `Invalid folder name: '${folder_name}'.`
          })
          return
        }

        if (is_file_like) {
          const fileUri = vscode.Uri.file(target_path)

          try {
            await vscode.workspace.fs.stat(fileUri)
            vscode.window.showInformationMessage(
              t('common.info.file-already-exists', {
                name: path.basename(target_path)
              })
            )
            return
          } catch {}

          const directory = path.dirname(target_path)
          await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory))

          const edit = new vscode.WorkspaceEdit()
          edit.createFile(fileUri, {
            overwrite: false,
            contents: new Uint8Array()
          })
          const applied = await vscode.workspace.applyEdit(edit)
          if (!applied) {
            throw new Error('Failed to apply create file edit')
          }

          const document = await vscode.workspace.openTextDocument(fileUri)
          await vscode.window.showTextDocument(document, { preview: false })
          return
        }

        try {
          await vscode.workspace.fs.stat(vscode.Uri.file(target_path))
          vscode.window.showInformationMessage(
            t('common.info.folder-already-exists', {
              name: path.basename(target_path)
            })
          )
          return
        } catch {
          // Folder doesn't exist, which is what we want
        }

        await vscode.workspace.fs.createDirectory(vscode.Uri.file(target_path))
      } catch (error) {
        if (is_file_like) {
          vscode.window.showInformationMessage(
            t('common.info.failed-to-create-file', {
            message: get_error_message(error)
            })
          )
        } else {
          vscode.window.showInformationMessage(
            t('common.info.failed-to-create-folder', {
            message: get_error_message(error)
            })
          )
        }
      }
    }
  )
}
