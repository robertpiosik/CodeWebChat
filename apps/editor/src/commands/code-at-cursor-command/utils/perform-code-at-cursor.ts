import * as vscode from 'vscode'
import axios from 'axios'
import he from 'he'
import { send_llm_message } from '../../../utils/send-llm-message'
import {
  code_at_cursor_output_formatting,
  code_at_cursor_user_instructions,
  code_at_cursor_output_formatting_for_chatbots,
  cli_edit_ask_requirements
} from '../../../constants/instructions'
import { invoke_agentic_cli } from '../../../utils/agentic-cli-invocation'
import { FilesCollector } from '../../../utils/files-collector'
import { ProvidersManager } from '../../../services/providers-manager'
import { Logger } from '@shared/utils/logger'
import { apply_reasoning_effort } from '../../../utils/apply-reasoning-effort'
import { t } from '@/i18n'
import { build_user_content } from '../../../utils/build-user-content'
import { get_code_at_cursor_api_configuration } from './get-code-at-cursor-config'
import { show_ghost_text } from './show-ghost-text'
import { PromptBuilder } from '../../../utils/prompt-builder'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'
import { OpenEditorsProvider } from '@/context/providers/open-editors/open-editors-provider'
import { WebSocketManager } from '@/services/websocket-manager'
import { show_configurations_quick_pick } from '@/utils/show-configurations-quick-pick'
import {
  get_last_used_web_configuration_key,
  LAST_COMPLETION_INSTRUCTIONS_STATE_KEY,
  LAST_USED_CODE_AT_CURSOR_ACTION_STATE_KEY,
  LAST_SELECTED_WORKSPACE_FOR_CODE_AT_CURSOR_STATE_KEY,
  LAST_USED_AGENT_FOR_CODE_AT_CURSOR_STATE_KEY
} from '@/constants/state-keys'
import { show_incomplete_setup_warning } from '@/utils/show-missing-configuration-notification'
import { ConfigWebConfigurationFormat } from '@/utils/web-configuration-format-converters'

export const perform_code_at_cursor = async (params: {
  workspace_provider: WorkspaceProvider
  open_editors_provider: OpenEditorsProvider
  extension_context: vscode.ExtensionContext
  websocket_manager: WebSocketManager
  with_completion_instructions: boolean
  show_quick_pick?: boolean
  completion_instructions?: string
  api_configuration_id?: string
}): Promise<void> => {
  const providers_manager = new ProvidersManager(params.extension_context)

  const editor = vscode.window.activeTextEditor
  if (!editor) return

  await editor.document.save()

  if (!editor.selection.isEmpty) {
    vscode.window.showWarningMessage(
      t('command.code-at-cursor-command.warning.no-selection')
    )
    return
  }

  let completion_instructions: string | undefined =
    params.completion_instructions
  let action: string | undefined = 'make-api'

  while (true) {
    if (
      params.with_completion_instructions &&
      !params.completion_instructions
    ) {
      const last_value =
        params.extension_context.workspaceState.get<string>(
          LAST_COMPLETION_INSTRUCTIONS_STATE_KEY
        ) || ''

      completion_instructions = await new Promise<string | undefined>(
        (resolve) => {
          const input = vscode.window.createInputBox()
          input.title = t('command.code-at-cursor-command.progress.title')
          input.placeholder = t(
            'command.code-at-cursor-command.instructions.placeholder'
          )
          input.prompt = t('command.code-at-cursor-command.instructions.prompt')
          input.value = last_value

          const close_button = {
            iconPath: new vscode.ThemeIcon('close'),
            tooltip: t('common.close')
          }

          input.buttons = [close_button]

          let is_resolved = false

          input.onDidTriggerButton((button) => {
            if (button === close_button) {
              is_resolved = true
              resolve(undefined)
              input.hide()
            }
          })

          input.onDidAccept(() => {
            is_resolved = true
            resolve(input.value)
            input.hide()
          })

          input.onDidHide(() => {
            if (!is_resolved) {
              resolve(undefined)
            }
            input.dispose()
          })

          input.show()
        }
      )

      if (completion_instructions === undefined) return

      await params.extension_context.workspaceState.update(
        LAST_COMPLETION_INSTRUCTIONS_STATE_KEY,
        completion_instructions || ''
      )
    }

    if (params.show_quick_pick) {
      action = await new Promise<string | undefined | 'back'>((resolve) => {
        const quick_pick = vscode.window.createQuickPick<
          vscode.QuickPickItem & { id: string }
        >()
        quick_pick.items = [
          {
            label: t('common.action.send-request'),
            id: 'make-api'
          },
          {
            label: t('common.action.invoke-agent'),
            id: 'invoke-agent'
          },
          ...(params.websocket_manager.is_connected_with_browser()
            ? [
                {
                  label: t('common.action.autofill-chatbot'),
                  id: 'autofill'
                }
              ]
            : []),
          {
            label: t('common.action.copy-prompt'),
            id: 'copy'
          }
        ]

        const last_action_id =
          params.extension_context.workspaceState.get<string>(
            LAST_USED_CODE_AT_CURSOR_ACTION_STATE_KEY
          )

        const active_item = last_action_id
          ? quick_pick.items.find((i) => i.id == last_action_id)
          : undefined

        if (active_item) {
          quick_pick.activeItems = [active_item]
        } else if (quick_pick.items.length > 0) {
          quick_pick.activeItems = [quick_pick.items[0]]
        }

        quick_pick.title = t('command.code-at-cursor-command.progress.title')
        quick_pick.placeholder = t(
          'common.action-quick-pick.placeholder.no-tokens'
        )

        const close_button = {
          iconPath: new vscode.ThemeIcon('close'),
          tooltip: t('common.close')
        }

        quick_pick.buttons =
          params.with_completion_instructions && !params.completion_instructions
            ? [vscode.QuickInputButtons.Back, close_button]
            : [close_button]

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
      })

      if (action === 'back') {
        continue
      }

      if (!action) return

      params.extension_context.workspaceState.update(
        LAST_USED_CODE_AT_CURSOR_ACTION_STATE_KEY,
        action
      )
    }

    break
  }

  const document = editor.document
  const position = editor.selection.active

  const text_before_cursor = document.getText(
    new vscode.Range(new vscode.Position(0, 0), position)
  )
  const text_after_cursor = document.getText(
    new vscode.Range(position, document.positionAt(document.getText().length))
  )

  const active_file_path = vscode.workspace.asRelativePath(document.uri)
  const active_file_path_fs = document.uri.fsPath
  const row = position.line
  const column = position.character

  const collected = await FilesCollector.collect_files({
    workspace_provider: params.workspace_provider,
    open_editors_provider: params.open_editors_provider,
    exclude_paths: [active_file_path_fs]
  })

  if (action == 'copy' || action == 'autofill') {
    const chatbot_instructions = code_at_cursor_output_formatting_for_chatbots({
      file_path: active_file_path,
      row,
      column
    })

    const { full_prompt: chatbot_prompt } = PromptBuilder.build_prompt({
      files_context_part1: collected.other_files,
      files_context_part2: collected.recent_files,
      active_file: {
        filepath: active_file_path,
        content: `${text_before_cursor}${
          completion_instructions
            ? `<missing_text>${completion_instructions}</missing_text>`
            : '<missing_text>'
        }${text_after_cursor}`
      },
      output_formatting: chatbot_instructions,
      user_instructions: code_at_cursor_user_instructions
    })

    if (action === 'copy') {
      await vscode.env.clipboard.writeText(chatbot_prompt)
      vscode.window.showInformationMessage(
        t('common.info.copied-to-clipboard', { item: 'Prompt' })
      )
      return
    }

    if (action === 'autofill') {
      const config = vscode.workspace.getConfiguration('codeWebChat')
      const all_web_configurations = config.get<ConfigWebConfigurationFormat[]>(
        'chatbots',
        []
      )
      const valid_web_configurations = all_web_configurations.filter(
        (c) => c.chatbot
      )

      if (valid_web_configurations.length == 0) {
        show_incomplete_setup_warning('web')
        return
      }

      let selected_web_configuration_name: string | undefined

      if (valid_web_configurations.length == 1) {
        selected_web_configuration_name = valid_web_configurations[0].name
      } else {
        const recents_key =
          get_last_used_web_configuration_key('code-at-cursor')
        const last_selected_name =
          params.extension_context.workspaceState.get<string>(recents_key) ??
          params.extension_context.globalState.get<string>(recents_key)

        const result = await show_configurations_quick_pick({
          items: valid_web_configurations,
          type: 'web',
          last_selected_id: last_selected_name,
          show_back_button: false
        })

        if (!result || result === 'back') {
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
          inject_apply_response_button: true
        })
        if (sent) {
          vscode.window.showInformationMessage(
            t('common.info.continue-in-browser')
          )
        }
      }

      return
    }
  }

  if (action == 'invoke-agent') {
    const { full_prompt: cli_prompt } = PromptBuilder.build_prompt({
      files_context_part1: collected.other_files,
      files_context_part2: collected.recent_files,
      active_file: {
        filepath: active_file_path,
        content: `${text_before_cursor}${
          completion_instructions
            ? `<missing_text>${completion_instructions}</missing_text>`
            : '<missing_text>'
        }${text_after_cursor}`
      },
      output_formatting: code_at_cursor_output_formatting,
      requirements: cli_edit_ask_requirements.restrict_shell_commands,
      user_instructions: code_at_cursor_user_instructions
    })

    const config = vscode.workspace.getConfiguration('codeWebChat')
    const agent_configs = config.get<any[]>('agents', []) || []
    const default_agent = agent_configs.find((c) => c.isDefaultForCodeAtCursor)

    const use_quick_pick = !default_agent
    const cli_configuration_name = default_agent
      ? default_agent.name
      : undefined

    const invoke_cli_result = await invoke_agentic_cli({
      workspace_provider: params.workspace_provider,
      extension_context: params.extension_context,
      build_prompt: async () => cli_prompt,
      notification_title: t('command.code-at-cursor-command.progress.title'),
      last_selected_workspace_state_key:
        LAST_SELECTED_WORKSPACE_FOR_CODE_AT_CURSOR_STATE_KEY,
      last_used_agent_config_name:
        params.extension_context.workspaceState.get<string>(
          LAST_USED_AGENT_FOR_CODE_AT_CURSOR_STATE_KEY
        ),
      cli_configuration_name,
      use_quick_pick,
      on_agent_selected: (name) => {
        params.extension_context.workspaceState.update(
          LAST_USED_AGENT_FOR_CODE_AT_CURSOR_STATE_KEY,
          name
        )
      },
      show_back_button: true,
      isolate_in_temp_dir: true,
      agent_args_type: 'isolated-dir'
    })

    if (invoke_cli_result === 'back') {
      return perform_code_at_cursor({
        workspace_provider: params.workspace_provider,
        open_editors_provider: params.open_editors_provider,
        extension_context: params.extension_context,
        websocket_manager: params.websocket_manager,
        with_completion_instructions: params.with_completion_instructions,
        show_quick_pick: true,
        completion_instructions: completion_instructions
      })
    }

    if (!invoke_cli_result) {
      return
    }

    const response_text = invoke_cli_result.agent_output
    const start_match = response_text.match(/<replacement>/i)

    let extracted_content = ''
    if (start_match) {
      const content_start = start_match.index! + start_match[0].length
      const remaining_text = response_text.substring(content_start)
      const end_match = remaining_text.match(/<\/replacement>/i)

      if (end_match) {
        extracted_content = remaining_text.substring(0, end_match.index)
      } else {
        extracted_content = remaining_text
      }
    } else {
      const code_block_match = response_text.match(/```[^\n]*\n([\s\S]*?)```/)
      if (code_block_match) {
        extracted_content = code_block_match[1]
      } else {
        extracted_content = response_text
      }
    }

    let decoded_completion = he.decode(extracted_content.trim())

    if (decoded_completion.startsWith('```')) {
      const first_newline = decoded_completion.indexOf('\n')
      if (first_newline !== -1) {
        decoded_completion = decoded_completion.substring(first_newline + 1)
      }
    }
    if (decoded_completion.endsWith('```')) {
      const last_newline = decoded_completion.lastIndexOf('\n')
      if (
        last_newline !== -1 &&
        last_newline > decoded_completion.indexOf('\n')
      ) {
        decoded_completion = decoded_completion.substring(0, last_newline)
      } else {
        decoded_completion = decoded_completion.substring(
          0,
          decoded_completion.length - 3
        )
      }
    }

    decoded_completion = decoded_completion.trim()

    await show_ghost_text({
      editor,
      position,
      decoded_completion,
      workspace_provider: params.workspace_provider,
      active_file_path_fs,
      completion_instructions
    })

    return
  }

  let show_quick_pick = params.show_quick_pick || false
  let current_api_configuration_id = params.api_configuration_id

  while (true) {
    const api_configuration_result = await get_code_at_cursor_api_configuration(
      {
        providers_manager,
        show_quick_pick,
        extension_context: params.extension_context,
        api_configuration_id: current_api_configuration_id
      }
    )

    if (!api_configuration_result) {
      return
    }

    show_quick_pick = false
    current_api_configuration_id = undefined

    const { provider, api_configuration: code_at_cursor_api_configuration } =
      api_configuration_result

    if (!code_at_cursor_api_configuration.provider_name) {
      vscode.window.showErrorMessage(
        t('common.error.api-provider-not-specified-for-code-at-cursor')
      )
      Logger.warn({
        function_name: 'perform_code_at_cursor',
        message: 'API provider is not specified for Code at Cursor tool.'
      })
      show_quick_pick = true
      continue
    } else if (!code_at_cursor_api_configuration.model) {
      vscode.window.showErrorMessage(
        t('common.error.model-not-specified-for-code-at-cursor')
      )
      Logger.warn({
        function_name: 'perform_code_at_cursor',
        message: 'Model is not specified for Code at Cursor tool.'
      })
      show_quick_pick = true
      continue
    }

    const abort_controller = new AbortController()

    const { part1, part2 } = PromptBuilder.build_prompt({
      files_context_part1: collected.other_files,
      files_context_part2: collected.recent_files,
      active_file: {
        filepath: active_file_path,
        content: `${text_before_cursor}${
          completion_instructions
            ? `<missing_text>${completion_instructions}</missing_text>`
            : '<missing_text>'
        }${text_after_cursor}`
      },
      output_formatting: code_at_cursor_output_formatting,
      user_instructions: code_at_cursor_user_instructions
    })

    const user_content = build_user_content({
      provider,
      part1,
      part2
    })

    const messages = [
      {
        role: 'user',
        content: user_content
      }
    ]

    const body: { [key: string]: any } = {
      messages,
      model: code_at_cursor_api_configuration.model
    }

    apply_reasoning_effort({
      body,
      provider,
      reasoning_effort: code_at_cursor_api_configuration.reasoning_effort
    })

    const cursor_listener = vscode.window.onDidChangeTextEditorSelection(() => {
      abort_controller.abort(
        t('command.code-at-cursor-command.cancel.cursor-moved')
      )
    })

    try {
      const completion_result = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: t('command.code-at-cursor-command.progress.title'),
          cancellable: true
        },
        async (progress, token) => {
          token.onCancellationRequested(() => {
            abort_controller.abort(t('common.cancel.user'))
          })

          progress.report({
            message: t('common.progress.waiting-for-server')
          })

          return await send_llm_message({
            base_url: provider.base_url,
            api_key: provider.api_key,
            body,
            abort_signal: abort_controller.signal,
            on_chunk: () => {
              progress.report({ message: t('common.progress.receiving') })
            },
            on_thinking_chunk: () => {
              progress.report({ message: t('common.progress.thinking') })
            }
          })
        }
      )

      if (completion_result) {
        const response_text = completion_result.response
        const start_match = response_text.match(/<replacement>/i)

        if (start_match) {
          const content_start = start_match.index! + start_match[0].length
          const remaining_text = response_text.substring(content_start)
          const end_match = remaining_text.match(/<\/replacement>/i)

          let extracted_content = ''
          if (end_match) {
            extracted_content = remaining_text.substring(0, end_match.index)
          } else {
            extracted_content = remaining_text
          }

          let decoded_completion = he.decode(extracted_content.trim())

          if (decoded_completion.startsWith('```')) {
            const first_newline = decoded_completion.indexOf('\n')
            if (first_newline !== -1) {
              decoded_completion = decoded_completion.substring(
                first_newline + 1
              )
            }
          }
          if (decoded_completion.endsWith('```')) {
            const last_newline = decoded_completion.lastIndexOf('\n')
            if (
              last_newline !== -1 &&
              last_newline > decoded_completion.indexOf('\n')
            ) {
              decoded_completion = decoded_completion.substring(0, last_newline)
            } else {
              decoded_completion = decoded_completion.substring(
                0,
                decoded_completion.length - 3
              )
            }
          }

          decoded_completion = decoded_completion.trim()

          await show_ghost_text({
            editor,
            position,
            decoded_completion,
            workspace_provider: params.workspace_provider,
            active_file_path_fs,
            completion_instructions
          })
        }
        break
      } else {
        show_quick_pick = true
        continue
      }
    } catch (err: any) {
      if (axios.isCancel(err)) {
        if (
          err.message == t('command.code-at-cursor-command.cancel.cursor-moved')
        ) {
          break
        }
        show_quick_pick = true
        continue
      }

      Logger.error({
        function_name: 'perform_code_at_cursor',
        message: 'Completion error',
        data: err
      })
      show_quick_pick = true
      continue
    } finally {
      cursor_listener.dispose()
    }
  }
}
