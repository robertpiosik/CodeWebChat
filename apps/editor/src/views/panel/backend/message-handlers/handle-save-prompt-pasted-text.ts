import * as vscode from 'vscode'
import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'
import * as crypto from 'crypto'
import { SavePromptPastedTextMessage } from '../../types/messages'
import { PanelProvider } from '../panel-provider'

export const handle_save_prompt_pasted_text = async (
  panel_provider: PanelProvider,
  message: SavePromptPastedTextMessage
) => {
  try {
    const hash = crypto.createHash('md5').update(message.text).digest('hex')
    const filename = `cwc-paste-${hash}.txt`
    const file_path = path.join(os.tmpdir(), filename)
    await fs.promises.writeFile(file_path, message.text, 'utf-8')
    const token_count = Math.ceil(message.text.length / 4)
    panel_provider.add_text_at_cursor_position(
      `#PastedText(${hash}:${token_count})`
    )
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to save pasted text: ${error}`)
  }
}
