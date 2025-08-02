import * as vscode from 'vscode'
import { FilesCollector } from '../utils/files-collector'

async function perform_code_completion_to_clipboard(
  file_tree_provider: any,
  open_editors_provider: any
) {
  const editor = vscode.window.activeTextEditor
  if (!editor) {
    vscode.window.showErrorMessage('No active editor found.')
    return
  }

  const document = editor.document
  const document_path = document.uri.fsPath
  const position = editor.selection.active

  const text_before_cursor = document.getText(
    new vscode.Range(new vscode.Position(0, 0), position)
  )
  const text_after_cursor = document.getText(
    new vscode.Range(position, document.positionAt(document.getText().length))
  )

  const files_collector = new FilesCollector(
    file_tree_provider,
    open_editors_provider
  )

  try {
    const collected_files = await files_collector.collect_files({
      exclude_path: document_path
    })

    const relative_path = vscode.workspace.asRelativePath(document.uri)

    const payload = {
      before: `<files>${collected_files}\n<file path="${relative_path}">\n<![CDATA[\n${text_before_cursor}`,
      after: `${text_after_cursor}\n]]>\n</file>\n</files>`
    }

    const content = `${payload.before}<missing text>${payload.after}`

    await vscode.env.clipboard.writeText(content)
    vscode.window.showInformationMessage(
      'Code completion prompt has been copied to clipboard.'
    )
  } catch (error: any) {
    vscode.window.showErrorMessage(`Failed to collect files: ${error.message}`)
  }
}

export function code_completion_to_clipboard_command(
  file_tree_provider: any,
  open_editors_provider?: any
) {
  return vscode.commands.registerCommand(
    'codeWebChat.codeCompletionToClipboard',
    async () => {
      await perform_code_completion_to_clipboard(
        file_tree_provider,
        open_editors_provider
      )
    }
  )
}
