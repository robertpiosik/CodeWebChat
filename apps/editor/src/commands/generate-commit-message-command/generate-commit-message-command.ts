import * as vscode from 'vscode'
import * as path from 'path'
import {
  get_git_repository,
  prepare_staged_changes
} from '../../utils/git-repository-utils'
import { display_token_count } from '../../utils/display-token-count'
import { get_commit_message_config } from './utils/get-commit-message-config'
import { build_commit_message_prompt } from './utils/build-commit-message-prompt'
import { generate_commit_message_with_api } from './utils/generate-commit-message-with-api'
import { ModelProvidersManager } from '@/services/model-providers-manager'
import { t } from '@/i18n'
import axios from 'axios'
import { PromptsForCommitMessagesUtils } from '../../utils/prompts-for-commit-messages-utils'
import { simplify_prompt_symbols } from '@shared/utils/simplify-prompt-symbols'
import { MAX_PROMPT_CHARS_IN_COMMIT_MESSAGE } from '@/constants/values'

const truncate_prompt = (text: string): string => {
  if (text.length <= MAX_PROMPT_CHARS_IN_COMMIT_MESSAGE) return text
  return text.substring(0, MAX_PROMPT_CHARS_IN_COMMIT_MESSAGE) + '...'
}

export const generate_commit_message_command = (
  context: vscode.ExtensionContext
) => {
  const get_prompt_data = async (
    source_control?: vscode.SourceControl,
    selection_state?: { files?: string[] }
  ) => {
    const repository = await get_git_repository(source_control)
    if (!repository) return null
    await vscode.workspace.saveAll()
    await repository.status()
    const was_empty_stage = (repository.state.indexChanges || []).length == 0
    const working_tree_changes = repository.state.workingTreeChanges || []
    const is_single_change = was_empty_stage && working_tree_changes.length == 1
    const diff = await prepare_staged_changes(
      repository,
      !!source_control,
      selection_state
    )
    if (!diff) return null
    const message_prompt = await build_commit_message_prompt(diff, repository)
    return { repository, was_empty_stage, message_prompt, is_single_change }
  }

  const run_generate_action = async (params: {
    should_commit: boolean
    source_control?: vscode.SourceControl
  }) => {
    let files_staged_by_action = false
    let is_single_change_flow = false
    const api_providers_manager = new ModelProvidersManager(context)
    let force_quick_pick = false
    const selection_state: { files?: string[] } = {}

    while (true) {
      const data = await get_prompt_data(params.source_control, selection_state)
      if (!data) return
      const { repository, message_prompt, is_single_change } = data
      let { was_empty_stage } = data

      // token count for the prompt, used in the config UI
      const token_count = Math.ceil(message_prompt.length / 4)

      if (was_empty_stage) {
        files_staged_by_action = true
        is_single_change_flow = is_single_change
      } else if (files_staged_by_action) {
        was_empty_stage = true
      }

      const default_config =
        await api_providers_manager.get_default_commit_messages_config()
      const has_default_config = !!default_config

      const show_back_button =
        was_empty_stage && !is_single_change_flow && !params.source_control

      const api_config_data = await get_commit_message_config(
        context,
        show_back_button,
        force_quick_pick,
        token_count
      )

      force_quick_pick = false

      if (api_config_data === 'back') {
        if (was_empty_stage) {
          if (!show_back_button) {
            await vscode.commands.executeCommand('git.unstageAll')
            return
          }

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

      let commit_message: string
      try {
        commit_message = await generate_commit_message_with_api({
          endpoint_url: api_config_data.endpoint_url,
          provider: api_config_data.provider,
          config: api_config_data.config,
          message: message_prompt
        })
      } catch (error) {
        if (axios.isCancel(error)) {
          force_quick_pick = true
          continue
        } else {
          force_quick_pick = true
          continue
        }
      }

      const workspace_root = repository.rootUri.fsPath
      const all_prompts =
        PromptsForCommitMessagesUtils.load_all(context)[workspace_root] || []
      const staged_files = repository.state.indexChanges.map((change) =>
        path.relative(workspace_root, change.uri.fsPath).replace(/\\/g, '/')
      )

      const include_prompts_setting = vscode.workspace
        .getConfiguration('codeWebChat')
        .get<boolean>('includePromptsInCommitMessages', true)

      const relevant_prompts = all_prompts.filter((p) =>
        p.files.some((file) => staged_files.includes(file))
      )

      if (params.should_commit) {
        const edited_message = await new Promise<string | 'back' | undefined>(
          (resolve) => {
            const input_box = vscode.window.createInputBox()
            input_box.value = commit_message
            input_box.title = t('command.commit-message.input.title')
            input_box.prompt = t('command.commit-message.input.prompt')

            if (has_default_config && !files_staged_by_action) {
              input_box.buttons = [
                {
                  iconPath: new vscode.ThemeIcon('close'),
                  tooltip: t('common.close')
                }
              ]
            } else {
              input_box.buttons = [vscode.QuickInputButtons.Back]
            }

            let is_resolved = false

            input_box.onDidTriggerButton((button) => {
              if (
                button === vscode.QuickInputButtons.Back ||
                button.tooltip === t('common.close')
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
          let selected_prompts = relevant_prompts

          if (include_prompts_setting && relevant_prompts.length > 0) {
            const picked = await new Promise<
              typeof relevant_prompts | undefined
            >((resolve) => {
              const quick_pick = vscode.window.createQuickPick()
              quick_pick.items = relevant_prompts.map((p) => ({
                label: simplify_prompt_symbols({ prompt: p.prompt }),
                prompt: p
              }))
              quick_pick.selectedItems = quick_pick.items
              quick_pick.canSelectMany = true
              quick_pick.title = 'Accepted Prompts'
              quick_pick.placeholder =
                'Choose accepted prompts to include in the commit message'
              quick_pick.ignoreFocusOut = true

              quick_pick.onDidAccept(() => {
                resolve(quick_pick.selectedItems.map((i: any) => i.prompt))
                quick_pick.hide()
              })

              quick_pick.onDidHide(() => {
                resolve(undefined)
                quick_pick.dispose()
              })

              quick_pick.show()
            })

            if (picked === undefined) {
              if (was_empty_stage) {
                await vscode.commands.executeCommand('git.unstageAll')
              }
              break
            }
            selected_prompts = picked
          }

          const selected_prompts_text =
            include_prompts_setting && selected_prompts.length > 0
              ? '\n\n' +
                selected_prompts
                  .map(
                    (p) =>
                      `- ${truncate_prompt(simplify_prompt_symbols({ prompt: p.prompt }))}`
                  )
                  .join('\n')
              : ''

          repository.inputBox.value = edited_message + selected_prompts_text
          await vscode.commands.executeCommand('git.commit', repository)
          PromptsForCommitMessagesUtils.remove_committed_files({
            context,
            workspace_root,
            prompts: relevant_prompts.map((p) => p.prompt),
            committed_files: staged_files
          })
        } else if (was_empty_stage) {
          await vscode.commands.executeCommand('git.unstageAll')
        }
      } else {
        const prompts_text =
          include_prompts_setting && relevant_prompts.length > 0
            ? '\n\n' +
              relevant_prompts
                .map(
                  (p) =>
                    `- ${truncate_prompt(simplify_prompt_symbols({ prompt: p.prompt }))}`
                )
                .join('\n')
            : ''
        repository.inputBox.value = commit_message + prompts_text
      }

      break
    }
  }

  const generate_command = vscode.commands.registerCommand(
    'codeWebChat.generateCommitMessage',
    async (source_control?: vscode.SourceControl) => {
      await run_generate_action({ source_control, should_commit: false })
    }
  )

  const generate_and_commit_command = vscode.commands.registerCommand(
    'codeWebChat.generateCommitMessageAndCommit',
    async (source_control?: vscode.SourceControl) => {
      await run_generate_action({ source_control, should_commit: true })
    }
  )

  const copy_command = vscode.commands.registerCommand(
    'codeWebChat.copyCommitMessagePrompt',
    async (source_control?: vscode.SourceControl) => {
      const data = await get_prompt_data(source_control)
      if (!data) return
      const { was_empty_stage, message_prompt } = data

      await vscode.env.clipboard.writeText(message_prompt)
      const token_count = Math.ceil(message_prompt.length / 4)
      vscode.window.showInformationMessage(
        t('command.commit-message.copied', {
          tokens: display_token_count(token_count)
        })
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
