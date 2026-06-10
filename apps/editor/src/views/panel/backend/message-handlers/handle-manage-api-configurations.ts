import * as vscode from 'vscode'

export const handle_manage_api_configurations = async (): Promise<void> => {
  await vscode.commands.executeCommand('codeWebChat.settings', 'api-configurations')
}

