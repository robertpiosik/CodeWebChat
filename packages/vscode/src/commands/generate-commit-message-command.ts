import * as vscode from 'vscode'
import { Logger } from '@/utils/logger'
import {
  get_git_repository,
  prepare_staged_changes
} from '../utils/git-repository-utils'
import { generate_commit_message_from_diff } from '../utils/commit-message-generator'

export function generate_commit_message_command(
  context: vscode.ExtensionContext
) {
  return vscode.commands.registerCommand(
    'codeWebChat.generateCommitMessage',
    async (source_control: vscode.SourceControl) => {
      const repository = get_git_repository(source_control)
      if (!repository) return

      try {
        const diff = await prepare_staged_changes(repository)
        if (!diff) return

        const commit_message = await generate_commit_message_from_diff(
          context,
          repository,
          'Waiting for a commit message...',
          diff
        )

        if (commit_message) {
          repository.inputBox.value = commit_message
        }
      } catch (error) {
        Logger.error({
          function_name: 'generate_commit_message_command',
          message: 'Error generating commit message',
          data: error
        })
        vscode.window.showErrorMessage(
          'Error generating commit message. See console for details.'
        )
      }
    }
  )
}
