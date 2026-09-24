import * as path from 'path'
import * as vscode from 'vscode'
import { Logger } from '@shared/utils/logger'
import { create_safe_path } from '../utils/path-sanitizer'
import { t } from '../i18n'
import { get_error_message } from '@/utils/get-error-message'

export const rename_command = () => {
  return vscode.commands.registerCommand(
    'codeWebChat.rename',
    async (item?: vscode.TreeItem) => {
      if (!item?.resourceUri) {
        return
      }

      const old_path = item.resourceUri.fsPath
      const dir_name = path.dirname(old_path)
      const current_name = path.basename(old_path)

      const new_name = await vscode.window.showInputBox({
        prompt: t('common.prompt.enter-name', { item: 'new' }),
        placeHolder: '',
        value: current_name
      })

      if (!new_name || new_name == current_name) {
        return
      }

      try {
        const new_path = create_safe_path(dir_name, new_name)

        if (!new_path) {
          return
        }

        try {
          await vscode.workspace.fs.stat(vscode.Uri.file(new_path))
          vscode.window.showInformationMessage(
            t('common.info.file-or-folder-already-exists', {
              name: path.basename(new_path)
            })
          )
          return
        } catch {
          // Target doesn't exist, proceed with renaming.
        }

        const old_uri = vscode.Uri.file(old_path)
        const new_uri = vscode.Uri.file(new_path)

        const edit = new vscode.WorkspaceEdit()
        edit.renameFile(old_uri, new_uri, { overwrite: false })
        const applied = await vscode.workspace.applyEdit(edit)
        if (!applied) {
          throw new Error('Failed to apply rename edit')
        }
      } catch (error) {
        Logger.error({
          function_name: 'rename_command',
          message: `Failed to rename: ${get_error_message(error)}`
        })
      }
    }
  )
}
