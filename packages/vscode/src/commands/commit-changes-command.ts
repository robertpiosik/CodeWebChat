import * as vscode from 'vscode'
import { execSync } from 'child_process'
import { Logger } from '@/utils/logger'
import {
  get_git_repository,
  prepare_staged_changes
} from '../utils/git-repository-utils'
import {
  generate_commit_message_from_diff,
  get_commit_message_config
} from '../utils/commit-message-generator'

export function commit_changes_command(context: vscode.ExtensionContext) {
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

        const commit_message = await generate_commit_message_from_diff(
          context,
          repository,
          'Generating commit message and committing...',
          diff,
          api_config // Pass the already resolved config
        )

        if (!commit_message) return

        try {
          execSync(`git commit -m "${commit_message.replace(/"/g, '\\"')}"`, {
            cwd: repository.rootUri.fsPath
          })

          vscode.window.showInformationMessage(
            `New commit: "${commit_message}".`
          )

          await repository.status()
        } catch (commit_error) {
          Logger.error({
            function_name: 'commit_changes_command',
            message: 'Error committing changes',
            data: commit_error
          })
          vscode.window.showErrorMessage('Failed to commit changes.')
        }
      } catch (error) {
        Logger.error({
          function_name: 'commit_changes_command',
          message: 'Error in commit changes command',
          data: error
        })
        vscode.window.showErrorMessage(
          'Error committing changes. See console for details.'
        )
      }
    }
  )
}
