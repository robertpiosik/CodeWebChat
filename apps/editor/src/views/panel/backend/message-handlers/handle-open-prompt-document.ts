import * as vscode from 'vscode'
import * as os from 'os'
import * as path from 'path'

export const handle_open_prompt_document = async (message: {
  hash: string
}) => {
  try {
    const hash = message.hash
    const filename = `cwc-document-${hash}.txt`
    const file_path = path.join(os.tmpdir(), filename)

    const doc = await vscode.workspace.openTextDocument(file_path)
    await vscode.window.showTextDocument(doc)
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to open document: ${error}`)
  }
}
