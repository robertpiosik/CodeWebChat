import * as vscode from 'vscode'
import { execSync } from 'child_process'
import { Logger } from '@shared/utils/logger'
import { LAST_APPLIED_CHANGES_STATE_KEY } from '@/constants/state-keys'
import { get_git_repository } from '@/utils/git-repository-utils'
import { dictionary } from '@shared/constants/dictionary'
import { PanelProvider } from '@/views/panel/backend/panel-provider'

export const handle_accept_commit_message = async (
  provider: PanelProvider,
  commit_message: string
): Promise<void> => {
  const repository = get_git_repository()
  if (!repository) return

  try {
    execSync(`git commit -m "${commit_message.replace(/"/g, '\\"')}"`, {
      cwd: repository.rootUri.fsPath
    })

    provider.context.workspaceState.update(LAST_APPLIED_CHANGES_STATE_KEY, null)
    provider.set_undo_button_state(false)

    await repository.status()
  } catch (commit_error) {
    Logger.error({
      function_name: 'handle_accept_commit_message',
      message: 'Error committing changes',
      data: commit_error
    })
    vscode.window.showErrorMessage(
      dictionary.error_message.FAILED_TO_COMMIT_CHANGES
    )
  }
}
