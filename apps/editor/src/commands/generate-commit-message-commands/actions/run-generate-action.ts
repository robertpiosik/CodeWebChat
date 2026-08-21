import * as vscode from 'vscode'
import * as path from 'path'
import { get_repository_for_commit } from '../../../utils/git-repository-utils'
import { get_commit_message_api_configuration } from '../utils/get-commit-message-config'
import { generate_commit_message_with_api } from '../utils/generate-commit-message-with-api'
import { t } from '@/i18n'
import axios from 'axios'
import { CommitMessageDetails } from '../../../utils/commit-message-details'
import { MAX_PROMPT_CHARS_IN_COMMIT_MESSAGE } from '@/constants/values'
import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'
import { create_checkpoint } from '@/features/checkpoints/actions'
import { AsciiTree } from '../../../utils/ascii-tree'
import {
  LAST_ATTACH_ASCII_TREE_STATE_KEY,
  get_last_used_web_configuration_key,
  LAST_USED_COMMIT_MESSAGE_ACTION_STATE_KEY
} from '@/constants/state-keys'
import { get_prompt_data } from './get-prompt-data'
import { display_token_count } from '@/utils/display-token-count'
import { show_configuration_quick_pick } from '@/utils/show-configuration-quick-pick'
import { CHATBOTS } from '@shared/constants/chatbots'
import { dictionary } from '@shared/constants/dictionary'
import { WebSocketManager } from '@/services/websocket-manager'
import { ModelProvidersManager } from '@/services/model-providers-manager'
import { get_response_preview_promise_resolve } from '@/commands/apply-response-command/utils/preview'
import { normalize_path } from '@/utils/normalize-path'

const truncate_prompt = (text: string): string => {
  if (text.length <= MAX_PROMPT_CHARS_IN_COMMIT_MESSAGE) return text
  return text.substring(0, MAX_PROMPT_CHARS_IN_COMMIT_MESSAGE) + '...'
}

export const run_generate_action = async (params: {
  should_commit: boolean
  source_control?: vscode.SourceControl
  extension_context: vscode.ExtensionContext
  prompt_view_provider: PromptViewProvider
  workspace_provider: WorkspaceProvider
  websocket_manager: WebSocketManager
  provided_text?: string
}) => {
  if (get_response_preview_promise_resolve()) {
    vscode.window.showWarningMessage(
      t('command.generate-commit-message.disabled-during-preview')
    )
    return
  }

  let files_staged_by_action = false
  let is_single_change_flow = false
  let force_quick_pick = false
  const selection_state: { files?: string[] } = {}

  const repository = await get_repository_for_commit(params.source_control)
  if (!repository) return

  while (true) {
    const data = await get_prompt_data({
      repository,
      stage_all_if_none_staged: !!params.source_control,
      selection_state,
      extension_context: params.extension_context,
      workspace_provider: params.workspace_provider,
      files_staged_by_action,
      is_single_change_flow: files_staged_by_action
        ? is_single_change_flow
        : undefined
    })

    if (data === 'back') {
      files_staged_by_action = false
      is_single_change_flow = false
      continue
    }
    if (!data) return

    const {
      api_prompt,
      chatbot_prompt,
      is_single_change,
      staged_files,
      was_context_prompt_shown,
      was_empty_stage
    } = data

    // token count for the prompt, used in the config UI
    const token_count = Math.ceil(api_prompt.length / 4)

    if (was_empty_stage) {
      files_staged_by_action = true
      is_single_change_flow = is_single_change
    }

    let commit_message: string = ''

    if (params.provided_text !== undefined) {
      commit_message = params.provided_text
    } else {
      const show_back_button =
        was_context_prompt_shown ||
        (was_empty_stage && !is_single_change_flow && !params.source_control)

      const action_make_api = t(
        'command.generate-commit-message.action.make-api-call'
      )
      const action_autofill_in_chatbot = t(
        'command.generate-commit-message.action.autofill-in-chatbot'
      )
      const action_enter_manually = t(
        'command.generate-commit-message.action.enter-manually'
      )
      const action_copy_prompt = t(
        'command.generate-commit-message.action.copy-prompt'
      )

      const model_providers_manager = new ModelProvidersManager(
        params.extension_context
      )
      const api_configurations =
        await model_providers_manager.get_api_configurations()
      const has_api_configurations = api_configurations.length > 0

      let current_action: string | undefined = undefined
      let go_back_to_prompt_data = false
      let action_completed = false

      while (!action_completed) {
        if (!current_action) {
          current_action = await new Promise<string | undefined | 'back'>(
            (resolve) => {
              const quick_pick = vscode.window.createQuickPick<
                vscode.QuickPickItem & { id: string }
              >()
              quick_pick.items = [
                ...(has_api_configurations
                  ? [{ label: action_make_api, id: 'make-api' }]
                  : []),
                ...(params.websocket_manager.is_connected_with_browser()
                  ? [{ label: action_autofill_in_chatbot, id: 'autofill' }]
                  : []),
                { label: action_enter_manually, id: 'manual' },
                { label: action_copy_prompt, id: 'copy' }
              ]

              const last_action_id =
                params.extension_context.workspaceState.get<string>(
                  LAST_USED_COMMIT_MESSAGE_ACTION_STATE_KEY
                )

              const active_item = last_action_id
                ? quick_pick.items.find((i) => i.id == last_action_id)
                : undefined

              if (active_item) {
                quick_pick.activeItems = [active_item]
              } else if (quick_pick.items.length > 0) {
                quick_pick.activeItems = [quick_pick.items[0]]
              }

              quick_pick.title = t(
                'command.generate-commit-message.action-quick-pick.title'
              )
              quick_pick.placeholder = t(
                'command.generate-commit-message.action-quick-pick.placeholder',
                { tokens: display_token_count(token_count) }
              )

              const close_button = {
                iconPath: new vscode.ThemeIcon('close'),
                tooltip: t('common.close')
              }

              quick_pick.buttons = [
                ...(show_back_button ? [vscode.QuickInputButtons.Back] : []),
                close_button
              ]

              let is_resolved = false

              quick_pick.onDidTriggerButton((button) => {
                if (button === vscode.QuickInputButtons.Back) {
                  is_resolved = true
                  resolve('back')
                  quick_pick.hide()
                } else if (button === close_button) {
                  is_resolved = true
                  resolve(undefined)
                  quick_pick.hide()
                }
              })

              quick_pick.onDidAccept(() => {
                is_resolved = true
                resolve(quick_pick.selectedItems[0]?.id)
                quick_pick.hide()
              })

              quick_pick.onDidHide(() => {
                if (!is_resolved) {
                  resolve(undefined)
                }
                quick_pick.dispose()
              })

              quick_pick.show()
            }
          )

          if (current_action == 'back') {
            if (was_context_prompt_shown) {
              go_back_to_prompt_data = true
              break
            }

            if (was_empty_stage) {
              if (!show_back_button) {
                await vscode.commands.executeCommand(
                  'git.unstageAll',
                  repository
                )
                return
              }

              await vscode.commands.executeCommand('git.unstageAll', repository)
              files_staged_by_action = false
              is_single_change_flow = false
              go_back_to_prompt_data = true
              break
            }
            return
          }

          if (!current_action) {
            if (was_empty_stage) {
              await vscode.commands.executeCommand('git.unstageAll', repository)
            }
            return
          }

          params.extension_context.workspaceState.update(
            LAST_USED_COMMIT_MESSAGE_ACTION_STATE_KEY,
            current_action
          )
        }

        const action = current_action

        if (action == 'copy') {
          await vscode.env.clipboard.writeText(chatbot_prompt)
          vscode.window.showInformationMessage(
            t('command.generate-commit-message.copied', {
              tokens: display_token_count(token_count)
            })
          )
          if (was_empty_stage) {
            await vscode.commands.executeCommand('git.unstageAll', repository)
          }
          return
        }

        if (action == 'autofill') {
          if (!params.websocket_manager.is_connected_with_browser()) {
            vscode.window.showWarningMessage(
              dictionary.warning_message.BROWSER_EXTENSION_NOT_CONNECTED
            )
            current_action = undefined
            continue
          }

          const config = vscode.workspace.getConfiguration('codeWebChat')
          const all_web_configurations = config.get<any[]>(
            'webConfigurations',
            []
          )
          const valid_web_configurations = all_web_configurations.filter(
            (c) => c.chatbot
          )

          if (valid_web_configurations.length == 0) {
            vscode.commands.executeCommand('codeWebChat.settings')
            vscode.window.showInformationMessage('No configurations found.')
            current_action = undefined
            continue
          }

          let selected_web_configuration_name: string | undefined

          if (valid_web_configurations.length == 1) {
            selected_web_configuration_name = valid_web_configurations[0].name
          } else {
            const recents_key =
              get_last_used_web_configuration_key('commit-message')
            const last_selected_name =
              params.extension_context.workspaceState.get<string>(
                recents_key
              ) ?? params.extension_context.globalState.get<string>(recents_key)

            const result = await show_configuration_quick_pick({
              items: valid_web_configurations,
              map_item: (web_configuration) => {
                const is_unnamed =
                  !web_configuration.name ||
                  /^\(\d+\)$/.test(web_configuration.name.trim())
                const chatbot_models =
                  CHATBOTS[web_configuration.chatbot as keyof typeof CHATBOTS]
                    ?.models
                const model = web_configuration.model
                  ? chatbot_models?.[web_configuration.model]?.label ||
                    web_configuration.model
                  : ''
                const details: string[] = []
                if (!is_unnamed && web_configuration.chatbot)
                  details.push(web_configuration.chatbot)
                if (model) details.push(model)
                if (web_configuration.reasoningEffort)
                  details.push(web_configuration.reasoningEffort)
                return {
                  label: `${is_unnamed ? web_configuration.chatbot! : web_configuration.name!.replace(/\s*\(\d+\)$/, '')}`,
                  description: details.join(' · '),
                  id: web_configuration.name || '',
                  is_pinned: web_configuration.isPinned
                }
              },
              last_selected_id: last_selected_name,
              show_back_button: true
            })

            if (result == 'back') {
              current_action = undefined
              continue
            } else if (!result) {
              if (was_empty_stage) {
                await vscode.commands.executeCommand(
                  'git.unstageAll',
                  repository
                )
              }
              return
            }
            selected_web_configuration_name = result.item.name

            if (selected_web_configuration_name) {
              params.extension_context.workspaceState.update(
                recents_key,
                selected_web_configuration_name
              )
              params.extension_context.globalState.update(
                recents_key,
                selected_web_configuration_name
              )
            }
          }

          if (selected_web_configuration_name) {
            const sent = await params.websocket_manager.initialize_chat({
              text: chatbot_prompt,
              web_configuration_name: selected_web_configuration_name,
              invocation_count: 1,
              inject_apply_response_button: true
            })
            if (sent) {
              vscode.window.showInformationMessage(
                'Continue in the connected browser'
              )
            }
          }

          if (was_empty_stage) {
            await vscode.commands.executeCommand('git.unstageAll', repository)
          }
          return
        }

        if (action == 'manual') {
          commit_message = await vscode.env.clipboard.readText()
          action_completed = true
        } else {
          const api_configuration_data =
            await get_commit_message_api_configuration(
              params.extension_context,
              true,
              force_quick_pick
            )

          force_quick_pick = false

          if (api_configuration_data == 'back') {
            current_action = undefined
            continue
          }

          if (!api_configuration_data) {
            if (was_empty_stage) {
              await vscode.commands.executeCommand('git.unstageAll', repository)
            }
            return
          }

          try {
            commit_message = await generate_commit_message_with_api({
              base_url: api_configuration_data.base_url,
              model_provider: api_configuration_data.model_provider,
              api_configuration: api_configuration_data.api_configuration,
              message: api_prompt
            })
            action_completed = true
          } catch (error: any) {
            if (
              axios.isCancel(error) ||
              error?.message == 'Operation cancelled by user'
            ) {
              force_quick_pick = true
              continue
            } else {
              if (error?.message == 'API request returned an empty response') {
                vscode.window.showErrorMessage(
                  t('command.generate-commit-message.error.empty-response')
                )
              }
              force_quick_pick = true
              continue
            }
          }
        }
      }

      if (go_back_to_prompt_data) {
        continue
      }
    }

    const workspace_root = repository.rootUri.fsPath
    const all_prompts =
      CommitMessageDetails.load_all(params.extension_context)[workspace_root] ||
      []

    const select_prompts_setting = vscode.workspace
      .getConfiguration('codeWebChat')
      .get<boolean>('selectAllPromptsInCommitMessagesByDefault', true)

    const relevant_prompts = all_prompts
      .filter((p) =>
        p.files.some((file) => {
          const rel_path = path.isAbsolute(file)
            ? normalize_path(path.relative(workspace_root, file))
            : normalize_path(file)
          return staged_files.includes(rel_path) || staged_files.includes(file)
        })
      )
      .filter(
        (p, index, self) =>
          index == self.findIndex((sp) => sp.prompt == p.prompt)
      )
      .filter((p) => p.prompt.trim() != '')

    const get_tree_text_if_applicable = async (
      selected_prompts: typeof relevant_prompts,
      show_back_button: boolean
    ): Promise<string | undefined | 'back'> => {
      const selected_files_set = new Set<string>()
      for (const p of selected_prompts) {
        for (const f of p.selected_files || []) {
          selected_files_set.add(f)
        }
      }
      const selected_files_to_attach = Array.from(selected_files_set)

      if (selected_files_to_attach.length == 0) {
        return ''
      }

      const all_files_touched = selected_files_to_attach.every((f) => {
        const rel_path = normalize_path(vscode.workspace.asRelativePath(f))
        return staged_files.includes(rel_path) || staged_files.includes(f)
      })

      if (all_files_touched) {
        return ''
      }

      const attach_tree_setting = vscode.workspace
        .getConfiguration('codeWebChat')
        .get<string>('attachAsciiTreeOfContext', 'ask')

      let attach_tree = false
      if (attach_tree_setting == 'always') {
        attach_tree = true
      } else if (attach_tree_setting == 'ask') {
        const attach_label = t(
          'command.generate-commit-message.attach-ascii-tree.attach'
        )
        const skip_label = t(
          'command.generate-commit-message.attach-ascii-tree.skip'
        )

        const last_selected_id =
          params.extension_context.workspaceState.get<string>(
            LAST_ATTACH_ASCII_TREE_STATE_KEY,
            'attach'
          )

        const answer = await new Promise<string | undefined | 'back'>(
          (resolve) => {
            const quick_pick = vscode.window.createQuickPick<
              vscode.QuickPickItem & { id: string }
            >()
            quick_pick.items = [
              { label: skip_label, id: 'skip' },
              { label: attach_label, id: 'attach' }
            ]
            quick_pick.activeItems = [
              quick_pick.items.find((i) => i.id == last_selected_id) ||
                quick_pick.items[1]
            ]
            quick_pick.title = t(
              'command.generate-commit-message.attach-ascii-tree.title'
            )
            quick_pick.placeholder = t(
              'command.generate-commit-message.attach-ascii-tree.placeholder'
            )
            quick_pick.ignoreFocusOut = true
            const close_button = {
              iconPath: new vscode.ThemeIcon('close'),
              tooltip: t('common.close')
            }
            quick_pick.buttons = [
              ...(show_back_button ? [vscode.QuickInputButtons.Back] : []),
              close_button
            ]

            let is_resolved = false

            quick_pick.onDidTriggerButton((button) => {
              if (button === vscode.QuickInputButtons.Back) {
                is_resolved = true
                resolve('back')
                quick_pick.hide()
              } else if (button === close_button) {
                is_resolved = true
                resolve(undefined)
                quick_pick.hide()
              }
            })

            quick_pick.onDidAccept(() => {
              is_resolved = true
              resolve(quick_pick.selectedItems[0]?.id)
              quick_pick.hide()
            })

            quick_pick.onDidHide(() => {
              if (!is_resolved) {
                resolve(undefined)
              }
              quick_pick.dispose()
            })

            quick_pick.show()
          }
        )

        if (answer === undefined || answer == 'back') {
          return answer
        }

        await params.extension_context.workspaceState.update(
          LAST_ATTACH_ASCII_TREE_STATE_KEY,
          answer
        )
        attach_tree = answer == 'attach'
      }

      if (attach_tree) {
        const display_paths = selected_files_to_attach.map((p) =>
          normalize_path(vscode.workspace.asRelativePath(p))
        )
        return '\n\n' + AsciiTree.generate(display_paths)
      }

      return ''
    }

    let final_edited_message = commit_message
    let selected_prompts = select_prompts_setting ? relevant_prompts : []
    let tree_text = ''

    let step: 'edit_message' | 'select_prompts' | 'attach_tree' | 'finish' =
      params.should_commit
        ? 'edit_message'
        : relevant_prompts.length > 0
          ? 'select_prompts'
          : 'attach_tree'
    let is_cancelled = false
    let go_back = false

    while (step != 'finish') {
      if (step == 'edit_message') {
        const edited = await new Promise<string | 'back' | undefined>(
          (resolve) => {
            const input_box = vscode.window.createInputBox()
            input_box.value = final_edited_message
            input_box.title = t('command.generate-commit-message.input.title')
            input_box.prompt = t('command.generate-commit-message.input.prompt')
            input_box.ignoreFocusOut = true

            const has_more_steps = relevant_prompts.length > 0
            const accept_button = {
              iconPath: new vscode.ThemeIcon(
                has_more_steps ? 'arrow-right' : 'check'
              ),
              tooltip: has_more_steps
                ? t('common.next')
                : t('command.generate-commit-message.input.accept')
            }

            const close_button = {
              iconPath: new vscode.ThemeIcon('close'),
              tooltip: t('common.close')
            }

            input_box.buttons = [
              accept_button,
              close_button,
              ...(params.provided_text !== undefined
                ? []
                : [vscode.QuickInputButtons.Back])
            ]

            let is_resolved = false

            input_box.onDidTriggerButton((button) => {
              if (button === accept_button) {
                is_resolved = true
                resolve(input_box.value)
                input_box.hide()
              } else if (button === close_button) {
                is_resolved = true
                resolve(undefined)
                input_box.hide()
              } else if (button === vscode.QuickInputButtons.Back) {
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
                resolve(undefined)
              }
              input_box.dispose()
            })

            input_box.show()
          }
        )

        if (edited == 'back') {
          go_back = true
          break
        } else if (edited === undefined) {
          is_cancelled = true
          break
        } else {
          final_edited_message = edited
          step = relevant_prompts.length > 0 ? 'select_prompts' : 'attach_tree'
        }
      } else if (step == 'select_prompts') {
        const picked = await new Promise<
          typeof relevant_prompts | undefined | 'back'
        >((resolve) => {
          const quick_pick = vscode.window.createQuickPick<
            vscode.QuickPickItem & { prompt: (typeof relevant_prompts)[0] }
          >()
          quick_pick.items = relevant_prompts.map((p) => ({
            label: p.prompt,
            prompt: p
          }))
          quick_pick.selectedItems = quick_pick.items.filter((i) =>
            selected_prompts.includes(i.prompt)
          )
          quick_pick.canSelectMany = true
          quick_pick.title = 'Accepted Prompts'
          quick_pick.placeholder =
            'Choose accepted prompts to include in the commit message'
          quick_pick.ignoreFocusOut = true
          const close_button = {
            iconPath: new vscode.ThemeIcon('close'),
            tooltip: t('common.close')
          }
          quick_pick.buttons = [
            ...(params.provided_text !== undefined && !params.should_commit
              ? []
              : [vscode.QuickInputButtons.Back]),
            close_button
          ]

          let is_resolved = false

          quick_pick.onDidTriggerButton((button) => {
            if (button === vscode.QuickInputButtons.Back) {
              is_resolved = true
              resolve('back')
              quick_pick.hide()
            } else if (button === close_button) {
              is_resolved = true
              resolve(undefined)
              quick_pick.hide()
            }
          })

          quick_pick.onDidAccept(() => {
            is_resolved = true
            resolve(quick_pick.selectedItems.map((i) => i.prompt))
            quick_pick.hide()
          })

          quick_pick.onDidHide(() => {
            if (!is_resolved) {
              resolve(undefined)
            }
            quick_pick.dispose()
          })

          quick_pick.show()
        })

        if (picked == 'back') {
          if (params.should_commit) {
            step = 'edit_message'
          } else {
            go_back = true
            break
          }
        } else if (picked === undefined) {
          is_cancelled = true
          break
        } else {
          selected_prompts = picked
          step = 'attach_tree'
        }
      } else if (step == 'attach_tree') {
        const can_go_back_in_wizard =
          relevant_prompts.length > 0 || params.should_commit
        const show_back_button =
          params.provided_text === undefined || can_go_back_in_wizard
        const result = await get_tree_text_if_applicable(
          selected_prompts,
          show_back_button
        )
        if (result == 'back') {
          if (relevant_prompts.length > 0) {
            step = 'select_prompts'
          } else if (params.should_commit) {
            step = 'edit_message'
          } else {
            go_back = true
            break
          }
        } else if (result === undefined) {
          is_cancelled = true
          break
        } else {
          tree_text = result
          step = 'finish'
        }
      }
    }

    if (go_back) {
      force_quick_pick = true
      continue
    }

    if (is_cancelled) {
      if (was_empty_stage) {
        await vscode.commands.executeCommand('git.unstageAll', repository)
      }
      break
    }

    if (params.should_commit) {
      const selected_prompts_text =
        selected_prompts.length > 0
          ? '\n\n' +
            selected_prompts
              .map((p) => `- ${truncate_prompt(p.prompt)}`)
              .join('\n')
          : ''

      const commit_message_value =
        final_edited_message + selected_prompts_text + tree_text
      repository.inputBox.value = commit_message_value
      await vscode.commands.executeCommand('git.commit', repository)
      CommitMessageDetails.remove_committed_files({
        extension_context: params.extension_context,
        workspace_root,
        prompts: relevant_prompts.map((p) => p.prompt),
        committed_files: staged_files
      })

      const subject_line = commit_message_value.split('\n')[0].trim()
      create_checkpoint({
        workspace_provider: params.workspace_provider,
        extension_context: params.extension_context,
        prompt_view_provider: params.prompt_view_provider,
        trigger: 'commit',
        description: subject_line
      }).catch(() => {})
    } else {
      const prompts_text =
        selected_prompts.length > 0
          ? '\n\n' +
            selected_prompts
              .map((p) => `- ${truncate_prompt(p.prompt)}`)
              .join('\n')
          : ''
      repository.inputBox.value =
        final_edited_message + prompts_text + tree_text
    }

    break
  }
}
