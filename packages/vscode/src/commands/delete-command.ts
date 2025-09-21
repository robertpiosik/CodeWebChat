import * as vscode from 'vscode'
import { DICTIONARY } from '@/constants/dictionary'

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
          `Are you sure you want to delete this ${item_type}?`,
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

        await vscode.workspace.fs.delete(uri, {
          recursive: true
        })
      } catch (error: any) {
        vscode.window.showErrorMessage(
          DICTIONARY.error_message.FAILED_TO_DELETE(error.message)
        )
      }
    }
  )
}
