import * as crypto from 'crypto'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import * as vscode from 'vscode'
import { PreviewGeneratedCodeMessage } from '../../types/messages'
import { get_error_message } from '@/utils/get-error-message'

export const handle_preview_generated_code = async (
  message: PreviewGeneratedCodeMessage
) => {
  const { file_path, content } = message

  const hash = crypto
    .createHash('md5')
    .update(`${file_path}-${Date.now()}`)
    .digest('hex')
  const temp_file_path = path.join(os.tmpdir(), `cwc-${hash}.txt`)

  try {
    await fs.promises.writeFile(temp_file_path, content, 'utf8')
  } catch (error) {
    vscode.window.showErrorMessage(
      'Failed to create temporary file for preview.'
    )
    return
  }

  try {
    const temp_doc = await vscode.workspace.openTextDocument(
      vscode.Uri.file(temp_file_path)
    )
    await vscode.window.showTextDocument(temp_doc, {
      preview: false
    })
    await vscode.commands.executeCommand(
      'workbench.action.moveEditorToNewWindow'
    )
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to open view: ${get_error_message(error)}`
    )
  }
}
