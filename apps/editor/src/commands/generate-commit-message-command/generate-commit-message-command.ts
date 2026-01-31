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
  const get_prompt_data = async (source_control?: vscode.SourceControl) => {
    const repository = await get_git_repository(source_control)
    if (!repository) return null

    await repository.status()
    const was_empty_stage = (repository.state.indexChanges || []).length == 0

    const diff = await prepare_staged_changes(repository)

    if (!diff) return null

    const message_prompt = build_commit_message_prompt(diff)

    return { repository, was_empty_stage, message_prompt }
  }

  const run_generate_action = async (
    source_control: vscode.SourceControl | undefined,
    should_commit: boolean
  ) => {
    const data = await get_prompt_data(source_control)
    if (!data) return
    const { repository, was_empty_stage, message_prompt } = data

    const api_config_data = await get_commit_message_config(context)

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
      if (should_commit) {
        await vscode.commands.executeCommand('git.commit', repository)
      }
    } else if (was_empty_stage) {
      await vscode.commands.executeCommand('git.unstageAll')
    }
  }

  const generate_command = vscode.commands.registerCommand(
    'codeWebChat.generateCommitMessage',
    async (source_control?: vscode.SourceControl) => {
      await run_generate_action(source_control, false)
    }
  )

  const generate_and_commit_command = vscode.commands.registerCommand(
    'codeWebChat.generateCommitMessageAndCommit',
    async (source_control?: vscode.SourceControl) => {
      await run_generate_action(source_control, true)
    }
  )

  const copy_command = vscode.commands.registerCommand(
    'codeWebChat.copyCommitMessagePrompt',
    async (source_control?: vscode.SourceControl) => {
      const data = await get_prompt_data(source_control)
      if (!data) return
      const { was_empty_stage, message_prompt } = data

      await vscode.env.clipboard.writeText(message_prompt)
      vscode.window.showInformationMessage(
        'Commit message prompt copied to clipboard'
      )

      if (was_empty_stage) {
        await vscode.commands.executeCommand('git.unstageAll')
      }
    }
  )

  return vscode.Disposable.from(
    generate_command,
    generate_and_commit_command,
    copy_command
  )
}
