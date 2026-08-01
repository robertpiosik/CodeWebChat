import * as vscode from 'vscode'
import * as os from 'os'
import * as path from 'path'

export const handle_open_prompt_pasted_text = async (message: {
  hash: string
}) => {
  try {
    const hash = message.hash
    const filename = `cwc-paste-${hash}.txt`
    const file_path = path.join(os.tmpdir(), filename)

    const doc = await vscode.workspace.openTextDocument(file_path)
    await vscode.window.showTextDocument(doc)
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to open pasted text: ${error}`)
  }
}
