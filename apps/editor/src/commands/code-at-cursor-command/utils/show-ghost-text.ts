import * as vscode from 'vscode'

export const show_ghost_text = async (params: {
  editor: vscode.TextEditor
  position: vscode.Position
  ghost_text: string
}) => {
  const document = params.editor.document
  const controller = vscode.languages.registerInlineCompletionItemProvider(
    { pattern: '**' },
    {
      provideInlineCompletionItems: (doc, pos) => {
        if (
          doc.uri.toString() === document.uri.toString() &&
          pos.line === params.position.line &&
          pos.character === params.position.character
        ) {
          return [
            new vscode.InlineCompletionItem(
              params.ghost_text,
              new vscode.Range(params.position, params.position)
            )
          ]
        }
        return []
      }
    }
  )

  const change_listener = vscode.workspace.onDidChangeTextDocument(
    async (e) => {
      if (e.document === document) {
        controller.dispose()
        change_listener.dispose()
      }
    }
  )

  await vscode.commands.executeCommand('editor.action.inlineSuggest.trigger')

  setTimeout(() => {
    controller.dispose()
    change_listener.dispose()
  }, 10000)
}
