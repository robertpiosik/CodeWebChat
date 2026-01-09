import * as vscode from 'vscode'
import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'
import * as crypto from 'crypto'
import { PreviewAiCodeMessage } from '../../types/messages'
import { PanelProvider } from '../panel-provider'

export const handle_preview_ai_code = async (
  panel: PanelProvider,
  message: PreviewAiCodeMessage
) => {
  const { file_path, content } = message

  // 1. Create temp file for content
  const hash = crypto
    .createHash('md5')
    .update(`${file_path}-${Date.now()}`)
    .digest('hex')
  const ext = path.extname(file_path) || '.txt'
  const temp_file_path = path.join(os.tmpdir(), `cwc-${hash}${ext}`)

  try {
    await fs.promises.writeFile(temp_file_path, content, 'utf8')
  } catch (error) {
    vscode.window.showErrorMessage(
      'Failed to create temporary file for preview.'
    )
    return
  }

  // 2. Open file
  try {
    const temp_doc = await vscode.workspace.openTextDocument(
      vscode.Uri.file(temp_file_path)
    )
    await vscode.window.showTextDocument(temp_doc, {
      preview: false,
      viewColumn: vscode.ViewColumn.Beside
    })
  } catch (error: any) {
    vscode.window.showErrorMessage(
      `Failed to open view: ${error.message || 'Unknown error'}`
    )
  }
}
