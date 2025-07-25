import * as vscode from 'vscode'

export function delete_command() {
  return vscode.commands.registerCommand(
    'codeWebChat.delete',
    async (item?: vscode.TreeItem) => {
      if (!item?.resourceUri) {
        return
      }

      const path = item.resourceUri.fsPath
      const uri = vscode.Uri.file(path)

      const result = await vscode.window.showWarningMessage(
        'Are you sure you want to delete this item?',
        { modal: true },
        'Delete'
      )

      if (result != 'Delete') {
        return
      }

      try {
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
        vscode.window.showErrorMessage(`Failed to delete: ${error.message}`)
      }
    }
  )
}
