import * as vscode from 'vscode'
import {
  get_git_repository,
  prepare_staged_changes
} from '../../utils/git-repository-utils'
import { display_token_count } from '../../utils/display-token-count'
import { get_commit_message_config } from './utils/get-commit-message-config'
import { build_commit_message_prompt } from './utils/build-commit-message-prompt'
import { generate_commit_message_with_api } from './utils/generate-commit-message-with-api'
import { ModelProvidersManager } from '@/services/model-providers-manager'

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
    let files_staged_by_action = false
    const api_providers_manager = new ModelProvidersManager(context)

    while (true) {
      const data = await get_prompt_data(source_control)
      if (!data) return
      const { repository, message_prompt } = data
      let { was_empty_stage } = data

      if (was_empty_stage) {
        files_staged_by_action = true
      } else if (files_staged_by_action) {
        was_empty_stage = true
      }

      const default_config =
        await api_providers_manager.get_default_commit_messages_config()
      const has_default_config = !!default_config

      const api_config_data = await get_commit_message_config(
        context,
        was_empty_stage
      )

      if (api_config_data === 'back') {
        if (was_empty_stage) {
          await vscode.commands.executeCommand('git.unstageAll')
          files_staged_by_action = false
          continue
        }
        return
      }

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
        if (should_commit) {
          const edited_message = await new Promise<string | 'back' | undefined>(
            (resolve) => {
              const input_box = vscode.window.createInputBox()
              input_box.value = commit_message
              input_box.title = 'Commit Message'
              input_box.prompt = 'Review the commit message.'

              if (has_default_config && !files_staged_by_action) {
                input_box.buttons = [
                  {
                    iconPath: new vscode.ThemeIcon('close'),
                    tooltip: 'Close'
                  }
                ]
              } else {
                input_box.buttons = [vscode.QuickInputButtons.Back]
              }

              let is_resolved = false

              input_box.onDidTriggerButton((button) => {
                if (
                  button === vscode.QuickInputButtons.Back ||
                  button.tooltip == 'Close'
                ) {
                  is_resolved = true
                  resolve('back')
                  input_box.hide()
                }
              })

              input_box.onDidAccept(() => {
                is_resolved = true
                resolve(input_box.value)
                input_box.hide()
              })

              input_box.onDidHide(() => {
                if (!is_resolved) {
                  resolve('back')
                }
                input_box.dispose()
              })

              input_box.show()
            }
          )

          if (edited_message === 'back') {
            if (has_default_config) {
              if (files_staged_by_action) {
                await vscode.commands.executeCommand('git.unstageAll')
              } else {
                return
              }
            }
            continue
          }

          if (edited_message) {
            repository.inputBox.value = edited_message
            await vscode.commands.executeCommand('git.commit', repository)
          } else if (was_empty_stage) {
            await vscode.commands.executeCommand('git.unstageAll')
          }
        } else {
          repository.inputBox.value = commit_message
        }
      } else if (was_empty_stage) {
        await vscode.commands.executeCommand('git.unstageAll')
      }

      break
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
      const token_count = Math.floor(message_prompt.length / 4)
      vscode.window.showInformationMessage(
        `Commit message prompt of about ${display_token_count(
          token_count
        )} tokens copied to clipboard.`
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
