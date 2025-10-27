import * as vscode from 'vscode'
import { dictionary } from '@shared/constants/dictionary'

export function delete_command() {
  return vscode.commands.registerCommand(
    'codeWebChat.delete',
    async (item?: vscode.TreeItem) => {
      if (!item?.resourceUri) {
        return
      }

      const path = item.resourceUri.fsPath
      const uri = vscode.Uri.file(path)

      try {
        const stats = await vscode.workspace.fs.stat(uri)
        const item_type = stats.type == vscode.FileType.File ? 'file' : 'folder'

        const result = await vscode.window.showWarningMessage(
          dictionary.warning_message.CONFIRM_DELETE_ITEM(
            item_type as 'file' | 'folder'
          ),
          { modal: true },
          'Delete'
        )

        if (result != 'Delete') {
          return
        }

        const open_documents = vscode.workspace.textDocuments
        const document_to_close = open_documents.find(
          (doc) => doc.uri.fsPath == path
        )

        if (document_to_close) {
          await vscode.window.showTextDocument(document_to_close.uri, {
            preview: false
          })
          await vscode.commands.executeCommand(
            'workbench.action.closeActiveEditor'
          )
        }

        const edit = new vscode.WorkspaceEdit()
        edit.deleteFile(uri, {
          recursive: true,
          ignoreIfNotExists: true
        })
        const applied = await vscode.workspace.applyEdit(edit)
        if (!applied) {
          throw new Error('Failed to apply delete edit')
        }
      } catch (error: any) {
        vscode.window.showErrorMessage(
          dictionary.error_message.FAILED_TO_DELETE(error.message)
        )
      }
    }
  )
}
