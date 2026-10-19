import * as vscode from 'vscode'
import { SavePromptPastedTextMessage } from '../../types/messages'
import { PromptViewProvider } from '../prompt-view-provider'
import { PersistentTextStorage } from '../utils/persistent-text-storage'

export const handle_save_prompt_pasted_text = async (
  prompt_view_provider: PromptViewProvider,
  message: SavePromptPastedTextMessage
) => {
  try {
    const storage = new PersistentTextStorage(
      prompt_view_provider.extension_context
    )
    const id = await storage.save(message.text)

    const token_count = Math.ceil(message.text.length / 4)
    prompt_view_provider.add_text_at_cursor_position(
      `#PastedText(${id}:${token_count})`
    )
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to save pasted text: ${error}`)
  }
}
