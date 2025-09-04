import * as vscode from 'vscode'
import { Logger } from '@shared/utils/logger'

export async function format_document(
  document: vscode.TextDocument
): Promise<void> {
  try {
    await vscode.commands.executeCommand(
      'editor.action.formatDocument',
      document.uri
    )
  } catch (error) {
    Logger.error({
      function_name: 'format_document',
      message: 'Error formatting document',
      data: { error, file: document.uri.fsPath }
    })
  }
}
