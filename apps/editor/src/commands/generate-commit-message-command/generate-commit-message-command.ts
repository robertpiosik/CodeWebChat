import * as vscode from 'vscode'
import {
  get_git_repository,
  prepare_staged_changes
} from '../../utils/git-repository-utils'
import { get_commit_message_config } from './utils/get-commit-message-config'
import { build_commit_message_prompt } from './utils/build-commit-message-prompt'
import { generate_commit_message_with_api } from './utils/generate-commit-message-with-api'

export const generate_commit_message_command = (
  context: vscode.ExtensionContext
) => {
  return vscode.commands.registerCommand(
    'codeWebChat.generateCommitMessage',
    async (source_control?: vscode.SourceControl) => {
      const repository = await get_git_repository(source_control)
      if (!repository) return

      await repository.status()
      const was_empty_stage = (repository.state.indexChanges || []).length == 0

      const diff = await prepare_staged_changes(repository)

      if (!diff) return

      const message_prompt = build_commit_message_prompt(diff)

      const api_config_data = await get_commit_message_config(
        context,
        message_prompt
      )
      if (!api_config_data) {
        if (was_empty_stage) {
          await vscode.commands.executeCommand('git.unstageAll')
        }
        return
      }

      const commit_message = await generate_commit_message_with_api({
        endpoint_url: api_config_data.endpoint_url,
        provider: api_config_data.provider,
        config: api_config_data.config,
        message: message_prompt
      })

      if (commit_message) {
        repository.inputBox.value = commit_message
      } else if (was_empty_stage) {
        await vscode.commands.executeCommand('git.unstageAll')
      }
    }
  )
}
