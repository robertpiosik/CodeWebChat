import * as vscode from 'vscode'
import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'
import * as crypto from 'crypto'
import { SavePromptImageMessage } from '../../types/messages'
import { PromptViewProvider } from '../prompt-view-provider'

export const handle_save_prompt_image = async (
  prompt_view_provider: PromptViewProvider,
  message: SavePromptImageMessage
) => {
  try {
    const buffer = Buffer.from(message.content_base64, 'base64')
    const hash = crypto.createHash('md5').update(buffer).digest('hex')
    const filename = `cwc-image-${hash}.txt`
    const file_path = path.join(os.tmpdir(), filename)
    await fs.promises.writeFile(file_path, message.content_base64, 'utf-8')
    prompt_view_provider.add_text_at_cursor_position(`#Image(${hash})`)
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to save image: ${error}`)
  }
}
