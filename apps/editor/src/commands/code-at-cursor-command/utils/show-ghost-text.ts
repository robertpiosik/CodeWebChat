import * as vscode from 'vscode'
import * as path from 'path'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'
import { normalize_path } from '@/utils/normalize-path'

export const show_ghost_text = async (params: {
  editor: vscode.TextEditor
  position: vscode.Position
  decoded_completion: string
  workspace_provider: WorkspaceProvider
  active_file_path_fs: string
  completion_instructions?: string
}) => {
  const workspace_root = params.workspace_provider.get_workspace_root_for_file(
    params.active_file_path_fs
  )
  const selected_files: string[] = []

  if (workspace_root) {
    const selected_files = params.workspace_provider.get_selected_files()
    for (const file of selected_files) {
      const file_workspace_root =
        params.workspace_provider.get_workspace_root_for_file(file)
      if (file_workspace_root === workspace_root) {
        const relative_path = normalize_path(
          path.relative(workspace_root, file)
        )
        selected_files.push(relative_path)
      }
    }
  }

  const command = workspace_root
    ? {
        title: 'Code at Cursor Accepted',
        command: 'codeWebChat.internal.codeAtCursorAccepted',
        arguments: [
          {
            workspace_root,
            prompt: params.completion_instructions || '',
            file_path: params.active_file_path_fs,
            selected_files
          }
        ]
      }
    : undefined

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
              params.decoded_completion,
              new vscode.Range(params.position, params.position),
              command
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
