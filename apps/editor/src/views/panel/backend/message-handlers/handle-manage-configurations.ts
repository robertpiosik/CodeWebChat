import * as vscode from 'vscode'

export const handle_manage_configurations = async (): Promise<void> => {
  await vscode.commands.executeCommand('codeWebChat.settings', 'configurations')
}
