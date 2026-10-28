import * as vscode from 'vscode'

export const replace_document_content = async (
  document: vscode.TextDocument,
  new_content: string
): Promise<void> => {
  const edit = new vscode.WorkspaceEdit()
  edit.replace(
    document.uri,
    new vscode.Range(
      document.positionAt(0),
      document.positionAt(document.getText().length)
    ),
    new_content
  )
  await vscode.workspace.applyEdit(edit)
  await document.save()
}
