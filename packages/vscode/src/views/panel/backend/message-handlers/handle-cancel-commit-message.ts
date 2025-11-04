import * as vscode from 'vscode'
import { PanelProvider } from '../panel-provider'

export const handle_cancel_commit_message = async (
  panel_provider: PanelProvider
): Promise<void> => {
  if (panel_provider.commit_was_staged_by_script) {
    await vscode.commands.executeCommand('git.unstageAll')
  }
  panel_provider.commit_was_staged_by_script = false
}
