import * as vscode from 'vscode'
import { OpenPromptPastedTextMessage } from '../../types/messages'
import { PromptViewProvider } from '../prompt-view-provider'
import { PersistentTextStorage } from '../utils/persistent-text-storage'

export const handle_open_prompt_pasted_text = async (
  prompt_view_provider: PromptViewProvider,
  message: OpenPromptPastedTextMessage
) => {
  try {
    const storage = new PersistentTextStorage(
      prompt_view_provider.extension_context
    )
    const file_path = storage.get_file_path(message.id)

    const doc = await vscode.workspace.openTextDocument(file_path)
    await vscode.window.showTextDocument(doc)
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to open pasted text: ${error}`)
  }
}
