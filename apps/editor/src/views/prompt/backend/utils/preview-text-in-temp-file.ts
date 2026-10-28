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
  const ext = params.extension || '.txt'
  let temp_dir_path: string

  try {
    temp_dir_path = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'cwc-preview-')
    )
  } catch {
    vscode.window.showErrorMessage(
      'Failed to create temporary directory for preview.'
    )
    return
  }

  const temp_file_path = path.join(temp_dir_path, `${params.prefix}${ext}`)

  try {
    await fs.promises.writeFile(temp_file_path, params.content, {
      encoding: 'utf8',
      mode: 0o600
    })
  } catch {
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
