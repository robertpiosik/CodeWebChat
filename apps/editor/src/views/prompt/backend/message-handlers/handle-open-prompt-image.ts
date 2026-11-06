import * as fs from 'fs'
import * as vscode from 'vscode'
import { OpenPromptImageMessage } from '../../types/messages'
import { PromptViewProvider } from '../prompt-view-provider'
import { PersistentPromptStorage } from '../utils/persistent-prompt-storage'

export const handle_open_prompt_image = async (
  prompt_view_provider: PromptViewProvider,
  message: OpenPromptImageMessage
) => {
  try {
    const hash = message.hash
    const storage = new PersistentPromptStorage(
      prompt_view_provider.extension_context,
      'image'
    )
    const file_path = storage.get_file_path(hash)

    // Verify the file exists before attempting to open
    try {
      await fs.promises.access(file_path)
    } catch {
      vscode.window.showErrorMessage(
        'Image file not found (it may have been deleted).'
      )
      return
    }

    // Open the image
    const uri = vscode.Uri.file(file_path)
    await vscode.commands.executeCommand('vscode.open', uri)
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to open image: ${error}`)
  }
}
