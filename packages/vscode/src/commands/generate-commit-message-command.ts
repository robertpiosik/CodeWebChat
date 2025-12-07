import * as vscode from 'vscode'
import {
  get_git_repository,
  prepare_staged_changes
} from '../utils/git-repository-utils'
import { generate_commit_message_from_diff } from '../views/panel/backend/message-handlers/handle-commit-changes/utils'

export function generate_commit_message_command(
  context: vscode.ExtensionContext
) {
  return vscode.commands.registerCommand(
    'codeWebChat.generateCommitMessage',
    async (source_control?: vscode.SourceControl) => {
      const repository = get_git_repository(source_control)
      if (!repository) return

      await repository.status()
      const was_empty_stage = (repository.state.indexChanges || []).length === 0

      const diff = await prepare_staged_changes(repository)

      if (!diff) return

      const commit_message = await generate_commit_message_from_diff({
        context,
        repository,
        diff
      })
      if (commit_message) {
        repository.inputBox.value = commit_message
      } else if (was_empty_stage) {
        await vscode.commands.executeCommand('git.unstageAll')
      }
    }
  )
}
