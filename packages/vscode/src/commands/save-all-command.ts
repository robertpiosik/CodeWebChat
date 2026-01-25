import * as vscode from 'vscode'

export const save_all_command = (): vscode.Disposable => {
  return vscode.commands.registerCommand('codeWebChat.saveAll', () => {
    return vscode.commands.executeCommand('workbench.action.files.saveAll')
  })
}
