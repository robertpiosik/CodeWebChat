import * as vscode from 'vscode'
import { SavePromptImageMessage } from '../../types/messages'
import { PromptViewProvider } from '../prompt-view-provider'
import { PersistentPromptStorage } from '../utils/persistent-prompt-storage'

export const handle_save_prompt_image = async (
  prompt_view_provider: PromptViewProvider,
  message: SavePromptImageMessage
) => {
  try {
    const storage = new PersistentPromptStorage(
      prompt_view_provider.extension_context,
      'image'
    )
    const hash = await storage.save(message.content_base64)
    prompt_view_provider.add_text_at_cursor_position(`#Image(${hash})`)
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to save image: ${error}`)
  }
}
