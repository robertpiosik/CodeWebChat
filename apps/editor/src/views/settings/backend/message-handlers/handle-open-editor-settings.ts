import * as vscode from 'vscode'

export const handle_open_editor_settings = async (): Promise<void> => {
  await vscode.commands.executeCommand('workbench.action.openSettings')
}
