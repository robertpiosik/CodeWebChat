import * as vscode from 'vscode'

export const uri_exists = async (uri: vscode.Uri): Promise<boolean> => {
  try {
    await vscode.workspace.fs.stat(uri)
    return true
  } catch {
    return false
  }
}
