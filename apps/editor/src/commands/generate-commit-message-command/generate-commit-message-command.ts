import * as vscode from 'vscode'
import {
  prepare_staged_changes,
  GitRepository,
  get_repository_for_commit
} from '../../utils/git-repository-utils'
import { display_token_count } from '../../utils/display-token-count'
import {
  get_commit_message_api_configuration,
  build_commit_message_prompt,
  generate_commit_message_with_api
} from '@/features/commit-messages'
import { t } from '@/i18n'
import axios from 'axios'
import { PromptsForCommitMessagesUtils } from '../../utils/prompts-for-commit-messages-utils'
import { MAX_PROMPT_CHARS_IN_COMMIT_MESSAGE } from '@/constants/values'
import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'
import { create_checkpoint } from '@/features/checkpoints/actions'
import { simplify_prompt_symbols } from '@shared/utils/simplify-prompt-symbols'
import { generate_ascii_tree } from '../../utils/ascii-tree'
import { LAST_ATTACH_ASCII_TREE_STATE_KEY } from '@/constants/state-keys'

const truncate_prompt = (text: string): string => {
  if (text.length <= MAX_PROMPT_CHARS_IN_COMMIT_MESSAGE) return text
  return text.substring(0, MAX_PROMPT_CHARS_IN_COMMIT_MESSAGE) + '...'
}

export const generate_commit_message_command = (
  extension_context: vscode.ExtensionContext,
  prompt_view_provider: PromptViewProvider,
  workspace_provider: WorkspaceProvider
) => {
  const get_prompt_data = async (params: {
    repository: GitRepository
    stage_all_if_none_staged: boolean
    selection_state?: { files?: string[] }
  }) => {
    await vscode.workspace.saveAll()
    await params.repository.status()
    const was_empty_stage =
      (params.repository.state.indexChanges || []).length == 0
    const working_tree_changes =
      params.repository.state.workingTreeChanges || []
    const is_single_change = was_empty_stage && working_tree_changes.length == 1
    const diff = await prepare_staged_changes({
      repository: params.repository,
      stage_all_if_none_staged: params.stage_all_if_none_staged,
      selection_state: params.selection_state
    })
    if (!diff) return null
    const message_prompt = await build_commit_message_prompt(
      diff,
      params.repository
    )

    const diff_file_paths: string[] = []
    const file_diffs = diff.split(/^diff --git /m).filter((d) => d.trim() != '')
    for (const file_diff_content of file_diffs) {
      const full_file_diff = 'diff --git ' + file_diff_content
      const lines = full_file_diff.split('\n')
      const old_path_line = lines.find((l) => l.startsWith('--- a/'))
      const new_path_line = lines.find((l) => l.startsWith('+++ b/'))

      const old_path = old_path_line
        ? old_path_line.substring('--- a/'.length)
        : undefined
      const new_path = new_path_line
        ? new_path_line.substring('+++ b/'.length)
        : undefined

      let file_path: string | undefined
      if (new_path && new_path != '/dev/null') {
        file_path = new_path
      } else if (old_path && old_path != '/dev/null') {
        file_path = old_path
      } else {
        const match = lines[0]?.match(/^diff --git a\/(.*) b\/(.*)$/)
        if (match) {
          file_path = match[2]
        }
      }
      if (file_path && !diff_file_paths.includes(file_path)) {
        diff_file_paths.push(file_path)
      }
    }

    return {
      repository: params.repository,
      was_empty_stage,
      message_prompt,
      is_single_change,
      staged_files: diff_file_paths
    }
  }

  const run_generate_action = async (params: {
    should_commit: boolean
    source_control?: vscode.SourceControl
  }) => {
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
        selection_state
      })
      if (!data) return
      const { message_prompt, is_single_change, staged_files } = data
      let { was_empty_stage } = data

      // token count for the prompt, used in the config UI
      const token_count = Math.ceil(message_prompt.length / 4)

      if (was_empty_stage) {
        files_staged_by_action = true
        is_single_change_flow = is_single_change
      } else if (files_staged_by_action) {
        was_empty_stage = true
      }

      const show_back_button =
        was_empty_stage && !is_single_change_flow && !params.source_control

      const api_configuration_data = await get_commit_message_api_configuration(
        extension_context,
        show_back_button,
        force_quick_pick,
        token_count
      )

      force_quick_pick = false

      if (api_configuration_data == 'back') {
        if (was_empty_stage) {
          if (!show_back_button) {
            await vscode.commands.executeCommand('git.unstageAll', repository)
            return
          }

          await vscode.commands.executeCommand('git.unstageAll', repository)
          files_staged_by_action = false
          continue
        }
        return
      }

      if (!api_configuration_data) {
        if (was_empty_stage) {
          await vscode.commands.executeCommand('git.unstageAll', repository)
        }
        return
      }

      let commit_message: string
      try {
        commit_message = await generate_commit_message_with_api({
          base_url: api_configuration_data.base_url,
          model_provider: api_configuration_data.model_provider,
          api_configuration: api_configuration_data.api_configuration,
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
        PromptsForCommitMessagesUtils.load_all(extension_context)[
          workspace_root
        ] || []

      const select_prompts_setting = vscode.workspace
        .getConfiguration('codeWebChat')
        .get<boolean>('selectAllPromptsInCommitMessagesByDefault', true)

      const relevant_prompts = all_prompts
        .filter((p) => p.files.some((file) => staged_files.includes(file)))
        .filter(
          (p, index, self) =>
            index == self.findIndex((sp) => sp.prompt == p.prompt)
        )

      const get_tree_text_if_applicable = async (
        selected_prompts: typeof relevant_prompts
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

          const last_selected = extension_context.workspaceState.get<string>(
            LAST_ATTACH_ASCII_TREE_STATE_KEY,
            attach_label
          )

          const answer = await new Promise<string | undefined | 'back'>(
            (resolve) => {
              const quick_pick = vscode.window.createQuickPick()
              quick_pick.items = [
                { label: attach_label },
                { label: skip_label }
              ]
              quick_pick.activeItems = [
                quick_pick.items.find((i) => i.label == last_selected) ||
                  quick_pick.items[0]
              ]
              quick_pick.title = t(
                'command.generate-commit-message.attach-ascii-tree.title'
              )
              quick_pick.ignoreFocusOut = true
              quick_pick.buttons = [vscode.QuickInputButtons.Back]

              let is_resolved = false

              quick_pick.onDidTriggerButton((button) => {
                if (button === vscode.QuickInputButtons.Back) {
                  is_resolved = true
                  resolve('back')
                  quick_pick.hide()
                }
              })

              quick_pick.onDidAccept(() => {
                is_resolved = true
                resolve(quick_pick.selectedItems[0]?.label)
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

          if (answer === undefined || answer === 'back') {
            return answer
          }

          await extension_context.workspaceState.update(
            LAST_ATTACH_ASCII_TREE_STATE_KEY,
            answer
          )
          attach_tree = answer == attach_label
        }

        if (attach_tree) {
          const display_paths = selected_files_to_attach.map((p) =>
            vscode.workspace.asRelativePath(p).replace(/\\/g, '/')
          )
          return '\n\n' + generate_ascii_tree(display_paths)
        }

        return ''
      }

      let final_edited_message = commit_message
      let selected_prompts = select_prompts_setting ? relevant_prompts : []
      let tree_text = ''

      let step: 'edit_message' | 'select_prompts' | 'attach_tree' | 'finish' =
        params.should_commit ? 'edit_message' : 'attach_tree'
      let is_cancelled = false
      let go_back = false

      while (step !== 'finish') {
        if (step === 'edit_message') {
          const edited = await new Promise<string | 'back' | undefined>(
            (resolve) => {
              const input_box = vscode.window.createInputBox()
              input_box.value = final_edited_message
              input_box.title = t('command.generate-commit-message.input.title')
              input_box.prompt = t(
                'command.generate-commit-message.input.prompt'
              )
              input_box.ignoreFocusOut = true

              const accept_button = {
                iconPath: new vscode.ThemeIcon('check'),
                tooltip: t('command.generate-commit-message.input.accept')
              }

              input_box.buttons = [accept_button, vscode.QuickInputButtons.Back]

              let is_resolved = false

              input_box.onDidTriggerButton((button) => {
                if (
                  button.tooltip ==
                  t('command.generate-commit-message.input.accept')
                ) {
                  is_resolved = true
                  resolve(input_box.value)
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

          if (edited === 'back') {
            go_back = true
            break
          } else if (edited === undefined) {
            is_cancelled = true
            break
          } else {
            final_edited_message = edited
            step =
              relevant_prompts.length > 0 ? 'select_prompts' : 'attach_tree'
          }
        } else if (step === 'select_prompts') {
          const picked = await new Promise<
            typeof relevant_prompts | undefined | 'back'
          >((resolve) => {
            const quick_pick = vscode.window.createQuickPick<
              vscode.QuickPickItem & { prompt: (typeof relevant_prompts)[0] }
            >()
            quick_pick.items = relevant_prompts.map((p) => ({
              label: simplify_prompt_symbols({ prompt: p.prompt }),
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
            quick_pick.buttons = [vscode.QuickInputButtons.Back]

            let is_resolved = false

            quick_pick.onDidTriggerButton((button) => {
              if (button === vscode.QuickInputButtons.Back) {
                is_resolved = true
                resolve('back')
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

          if (picked === 'back') {
            step = 'edit_message'
          } else if (picked === undefined) {
            is_cancelled = true
            break
          } else {
            selected_prompts = picked
            step = 'attach_tree'
          }
        } else if (step === 'attach_tree') {
          const result = await get_tree_text_if_applicable(selected_prompts)
          if (result === 'back') {
            if (params.should_commit) {
              step =
                relevant_prompts.length > 0 ? 'select_prompts' : 'edit_message'
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
                .map(
                  (p) =>
                    `- ${truncate_prompt(simplify_prompt_symbols({ prompt: p.prompt }))}`
                )
                .join('\n')
            : ''

        const commit_message_value =
          final_edited_message + selected_prompts_text + tree_text
        repository.inputBox.value = commit_message_value
        await vscode.commands.executeCommand('git.commit', repository)
        PromptsForCommitMessagesUtils.remove_committed_files({
          extension_context: extension_context,
          workspace_root,
          prompts: relevant_prompts.map((p) => p.prompt),
          committed_files: staged_files
        })

        const subject_line = commit_message_value.split('\n')[0].trim()
        create_checkpoint({
          workspace_provider,
          extension_context,
          prompt_view_provider,
          trigger: 'commit',
          description: subject_line
        }).catch(() => {})
      } else {
        const prompts_text =
          selected_prompts.length > 0
            ? '\n\n' +
              selected_prompts
                .map(
                  (p) =>
                    `- ${truncate_prompt(simplify_prompt_symbols({ prompt: p.prompt }))}`
                )
                .join('\n')
            : ''
        repository.inputBox.value =
          final_edited_message + prompts_text + tree_text
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
      const repository = await get_repository_for_commit(source_control)
      if (!repository) return
      const data = await get_prompt_data({
        repository,
        stage_all_if_none_staged: !!source_control
      })
      if (!data) return
      const { was_empty_stage, message_prompt } = data

      await vscode.env.clipboard.writeText(message_prompt)
      const token_count = Math.ceil(message_prompt.length / 4)
      vscode.window.showInformationMessage(
        t('command.generate-commit-message.copied', {
          tokens: display_token_count(token_count)
        })
      )

      if (was_empty_stage) {
        await vscode.commands.executeCommand('git.unstageAll', repository)
      }
    }
  )

  return vscode.Disposable.from(
    generate_command,
    generate_and_commit_command,
    copy_command
  )
}
