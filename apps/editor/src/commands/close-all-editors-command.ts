import * as vscode from 'vscode'

export const close_all_editors_command = (): vscode.Disposable => {
  return vscode.commands.registerCommand('codeWebChat.closeAllEditors', () => {
    return vscode.commands.executeCommand('workbench.action.closeAllEditors')
  })
}
