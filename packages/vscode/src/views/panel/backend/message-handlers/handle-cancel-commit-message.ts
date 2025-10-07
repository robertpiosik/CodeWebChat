import * as vscode from 'vscode'
import { ViewProvider } from '../view-provider'

export const handle_cancel_commit_message = async (
  provider: ViewProvider
): Promise<void> => {
  if (provider.commit_was_staged_by_script) {
    await vscode.commands.executeCommand('git.unstageAll')
  }
  provider.commit_was_staged_by_script = false
}
