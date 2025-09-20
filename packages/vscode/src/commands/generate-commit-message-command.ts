import * as vscode from 'vscode'
import { Logger } from '@shared/utils/logger'
import {
  get_git_repository,
  prepare_staged_changes
} from '../utils/git-repository-utils'
import { DICTIONARY } from '@/constants/dictionary'
import { generate_commit_message_from_diff } from '../utils/commit-message-generator'

export const generate_commit_message_command = (
  context: vscode.ExtensionContext
) => {
  return vscode.commands.registerCommand(
    'codeWebChat.generateCommitMessage',
    async (source_control: vscode.SourceControl) => {
      const repository = get_git_repository(source_control)
      if (!repository) return

      try {
        const diff = await prepare_staged_changes(repository)
        if (!diff) return

        const commit_message = await generate_commit_message_from_diff({
          context,
          repository,
          diff
        })

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
          DICTIONARY.ERROR_GENERATING_COMMIT_MESSAGE
        )
      }
    }
  )
}
