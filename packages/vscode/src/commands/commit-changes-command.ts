import * as vscode from 'vscode'
import { execSync } from 'child_process'
import { Logger } from '@shared/utils/logger'
import { LAST_APPLIED_CHANGES_STATE_KEY } from '../constants/state-keys'
import {
  get_git_repository,
  prepare_staged_changes
} from '../utils/git-repository-utils'
import { dictionary } from '@shared/constants/dictionary'
import {
  generate_commit_message_from_diff,
  get_commit_message_config
} from '../utils/commit-message-generator'
import { ViewProvider } from '@/views/panel/backend/view-provider'

export const commit_changes_command = (
  context: vscode.ExtensionContext,
  view_provider: ViewProvider
) => {
  return vscode.commands.registerCommand(
    'codeWebChat.commitChanges',
    async (source_control?: vscode.SourceControl) => {
      const repository = get_git_repository(source_control)
      if (!repository) return

      try {
        // Check configuration first before any git operations
        const api_config = await get_commit_message_config(context)
        if (!api_config) return

        const diff = await prepare_staged_changes(repository)
        if (!diff) return

        const commit_message = await generate_commit_message_from_diff({
          context,
          repository,
          diff,
          api_config, // Pass the already resolved config
          view_provider
        })

        if (!commit_message) return

        view_provider.set_undo_button_state(false)

        try {
          execSync(`git commit -m "${commit_message.replace(/"/g, '\\"')}"`, {
            cwd: repository.rootUri.fsPath
          })

          vscode.window.showInformationMessage(`New commit: ${commit_message}.`)

          context.workspaceState.update(LAST_APPLIED_CHANGES_STATE_KEY, null)

          await repository.status()
        } catch (commit_error) {
          Logger.error({
            function_name: 'commit_changes_command',
            message: 'Error committing changes',
            data: commit_error
          })
          vscode.window.showErrorMessage(
            dictionary.error_message.FAILED_TO_COMMIT_CHANGES
          )
        }
      } catch (error) {
        Logger.error({
          function_name: 'commit_changes_command',
          message: 'Error in commit changes command',
          data: error
        })
        vscode.window.showErrorMessage(
          dictionary.error_message.ERROR_COMMITTING_CHANGES
        )
      }
    }
  )
}
