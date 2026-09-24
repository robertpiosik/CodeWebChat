import * as crypto from 'crypto'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import * as vscode from 'vscode'
import { get_error_message } from '@/utils/get-error-message'

export const preview_text_in_temp_file = async (params: {
  prefix: string
  content: string
  extension?: string
}): Promise<void> => {
  const hash = crypto
    .createHash('md5')
    .update(`${Date.now()}-${Math.random()}`)
    .digest('hex')
  const ext = params.extension || '.txt'
  const temp_file_path = path.join(
    os.tmpdir(),
    `${params.prefix}-${hash}${ext}`
  )

  try {
    await fs.promises.writeFile(temp_file_path, params.content, 'utf8')
  } catch (error) {
    vscode.window.showErrorMessage(
      'Failed to create temporary file for preview.'
    )
    return
  }

  try {
    const document = await vscode.workspace.openTextDocument(
      vscode.Uri.file(temp_file_path)
    )
    await vscode.window.showTextDocument(document, {
      preview: true
    })
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to open view: ${get_error_message(error)}`
    )
  }
}
