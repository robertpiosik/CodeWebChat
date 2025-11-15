import * as vscode from 'vscode'
import { execSync } from 'child_process'
import { Logger } from '@shared/utils/logger'
import { LAST_APPLIED_CHANGES_STATE_KEY } from '@/constants/state-keys'
import { get_git_repository } from '@/utils/git-repository-utils'
import { dictionary } from '@shared/constants/dictionary'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { create_checkpoint } from '@/commands/checkpoints-command/actions'

export const handle_accept_commit_message = async (
  panel_provider: PanelProvider,
  commit_message: string
): Promise<void> => {
  const repository = get_git_repository()
  if (!repository) return

  try {
    execSync(`git commit -m "${commit_message.replace(/"/g, '\\"')}"`, {
      cwd: repository.rootUri.fsPath
    })

    panel_provider.context.workspaceState.update(
      LAST_APPLIED_CHANGES_STATE_KEY,
      null
    )
    panel_provider.set_undo_button_state(false)

    await repository.status()

    const title = 'Committed changes'
    const description = commit_message
    const commit_message_lines = commit_message.split('\n')
    const shortened_commit_message = commit_message_lines.length
      ? `${commit_message_lines[0]}...`
      : commit_message_lines[0]
    vscode.window.showInformationMessage(
      dictionary.information_message.COMMIT_CREATED_SUCCESSFULLY(
        shortened_commit_message
      )
    )
    await create_checkpoint(
      panel_provider.workspace_provider,
      panel_provider.context,
      title,
      description
    )
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
