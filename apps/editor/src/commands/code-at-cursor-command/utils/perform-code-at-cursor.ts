import * as vscode from 'vscode'
import axios from 'axios'
import * as path from 'path'
import he from 'he'
import { send_llm_message } from '../../../utils/send-llm-message'
import {
  code_at_cursor_instructions,
  code_at_cursor_instructions_for_chatbots
} from '../../../constants/instructions'
import { FilesCollector } from '../../../utils/files-collector'
import { ModelProvidersManager } from '../../../services/model-providers-manager'
import { Logger } from '@shared/utils/logger'
import { dictionary } from '@shared/constants/dictionary'
import { apply_reasoning_effort } from '../../../utils/apply-reasoning-effort'
import { t } from '@/i18n'
import { build_user_content } from '../../../utils/build-user-content'
import { get_code_at_cursor_api_configuration } from './get-code-at-cursor-config'
import { show_ghost_text } from './show-ghost-text'
import { PromptBuilder } from '../../../utils/prompt-builder'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'
import { OpenEditorsProvider } from '@/context/providers/open-editors/open-editors-provider'
import { normalize_path } from '@/utils/normalize-path'
import { WebSocketManager } from '@/services/websocket-manager'
import { show_configuration_quick_pick } from '@/utils/show-configuration-quick-pick'
import { CHATBOTS } from '@shared/constants/chatbots'
import { get_last_used_web_configuration_key } from '@/constants/state-keys'
import { show_no_configurations_warning } from '@/utils/show-no-configurations-warning'

export const perform_code_at_cursor = async (params: {
  workspace_provider: WorkspaceProvider
  open_editors_provider: OpenEditorsProvider
  extension_context: vscode.ExtensionContext
  websocket_manager: WebSocketManager
  with_completion_instructions: boolean
  show_quick_pick?: boolean
  completion_instructions?: string
  api_configuration_id?: string
}) => {
  const model_providers_manager = new ModelProvidersManager(
    params.extension_context
  )

  const editor = vscode.window.activeTextEditor
  if (!editor) return

  await editor.document.save()

  if (!editor.selection.isEmpty) {
    vscode.window.showWarningMessage(
      dictionary.warning_message.CODE_AT_CURSOR_NO_SELECTION
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
          'last-completion-instructions'
        ) || ''

      completion_instructions = await new Promise<string | undefined>(
        (resolve) => {
          const input = vscode.window.createInputBox()
          input.title = t('command.code-at-cursor.progress.title')
          input.placeholder = t(
            'command.code-at-cursor.instructions.placeholder'
          )
          input.prompt = t('command.code-at-cursor.instructions.prompt')
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
        'last-completion-instructions',
        completion_instructions || ''
      )
    }

    if (params.show_quick_pick) {
      const api_configurations =
        await model_providers_manager.get_api_configurations()
      const has_api_configurations = api_configurations.length > 0

      action = await new Promise<string | undefined | 'back'>((resolve) => {
        const quick_pick = vscode.window.createQuickPick<
          vscode.QuickPickItem & { id: string }
        >()
        quick_pick.items = [
          ...(has_api_configurations
            ? [
                {
                  label: t(
                    'command.generate-commit-message.action.make-api-call'
                  ),
                  id: 'make-api'
                }
              ]
            : []),
          ...(params.websocket_manager.is_connected_with_browser()
            ? [
                {
                  label: t(
                    'command.generate-commit-message.action.autofill-in-chatbot'
                  ),
                  id: 'autofill'
                }
              ]
            : []),
          {
            label: t('command.generate-commit-message.action.copy-prompt'),
            id: 'copy'
          }
        ]

        const last_action_id =
          params.extension_context.workspaceState.get<string>(
            'last_used_code_at_cursor_action'
          )

        const active_item = last_action_id
          ? quick_pick.items.find((i) => i.id == last_action_id)
          : undefined

        if (active_item) {
          quick_pick.activeItems = [active_item]
        } else if (quick_pick.items.length > 0) {
          quick_pick.activeItems = [quick_pick.items[0]]
        }

        quick_pick.title = t('command.code-at-cursor.progress.title')
        quick_pick.placeholder = t(
          'command.generate-commit-message.action-quick-pick.placeholder'
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
        'last_used_code_at_cursor_action',
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
  const row = position.line
  const column = position.character

  const collected = await FilesCollector.collect_files({
    workspace_provider: params.workspace_provider,
    open_editors_provider: params.open_editors_provider
  })

  if (action == 'copy' || action == 'autofill') {
    const chatbot_instructions = code_at_cursor_instructions_for_chatbots({
      file_path: active_file_path,
      row,
      column
    })

    const { part1, part2 } = PromptBuilder.build_prompt({
      other_files: collected.other_files,
      recent_files: collected.recent_files,
      active_file: {
        filepath: active_file_path,
        content: `${text_before_cursor}${
          completion_instructions
            ? `<missing_text>${completion_instructions}</missing_text>`
            : '<missing_text>'
        }${text_after_cursor}`
      },
      system_instructions: chatbot_instructions
    })

    const chatbot_prompt = `${part1}\n\n${part2}`

    if (action === 'copy') {
      await vscode.env.clipboard.writeText(chatbot_prompt)
      vscode.window.showInformationMessage(t('common.info.copied-to-clipboard'))
      return
    }

    if (action === 'autofill') {
      const config = vscode.workspace.getConfiguration('codeWebChat')
      const all_web_configurations = config.get<any[]>('webConfigurations', [])
      const valid_web_configurations = all_web_configurations.filter(
        (c) => c.chatbot
      )

      if (valid_web_configurations.length == 0) {
        show_no_configurations_warning('web')
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
            'Continue in the connected browser'
          )
        }
      }

      return
    }
  }

  let force_show_quick_pick = params.show_quick_pick || false
  let current_api_configuration_id = params.api_configuration_id

  while (true) {
    const api_configuration_result = await get_code_at_cursor_api_configuration(
      {
        model_providers_manager,
        show_quick_pick: force_show_quick_pick,
        extension_context: params.extension_context,
        api_configuration_id: current_api_configuration_id
      }
    )

    if (!api_configuration_result) {
      return
    }

    force_show_quick_pick = false
    current_api_configuration_id = undefined

    const {
      model_provider,
      api_configuration: code_at_cursor_api_configuration
    } = api_configuration_result

    if (!code_at_cursor_api_configuration.model_provider_name) {
      vscode.window.showErrorMessage(
        dictionary.error_message.API_PROVIDER_NOT_SPECIFIED_FOR_CODE_AT_CURSOR
      )
      Logger.warn({
        function_name: 'perform_code_at_cursor',
        message: 'API provider is not specified for Code at Cursor tool.'
      })
      force_show_quick_pick = true
      continue
    } else if (!code_at_cursor_api_configuration.model) {
      vscode.window.showErrorMessage(
        dictionary.error_message.MODEL_NOT_SPECIFIED_FOR_CODE_AT_CURSOR
      )
      Logger.warn({
        function_name: 'perform_code_at_cursor',
        message: 'Model is not specified for Code at Cursor tool.'
      })
      force_show_quick_pick = true
      continue
    }

    const abort_controller = new AbortController()

    const { part1, part2 } = PromptBuilder.build_prompt({
      other_files: collected.other_files,
      recent_files: collected.recent_files,
      active_file: {
        filepath: active_file_path,
        content: `${text_before_cursor}${
          completion_instructions
            ? `<missing_text>${completion_instructions}</missing_text>`
            : '<missing_text>'
        }${text_after_cursor}`
      },
      system_instructions: code_at_cursor_instructions
    })

    const user_content = build_user_content({
      model_provider,
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
      model_provider,
      reasoning_effort: code_at_cursor_api_configuration.reasoning_effort
    })

    const cursor_listener = vscode.window.onDidChangeTextEditorSelection(() => {
      abort_controller.abort(t('command.code-at-cursor.cancel.cursor-moved'))
    })

    try {
      const completion_result = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: t('command.code-at-cursor.progress.title'),
          cancellable: true
        },
        async (progress, token) => {
          token.onCancellationRequested(() => {
            abort_controller.abort(t('command.code-at-cursor.cancel.user'))
          })

          progress.report({
            message: t('common.progress.waiting-for-server')
          })

          return await send_llm_message({
            base_url: model_provider.base_url,
            api_key: model_provider.api_key,
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

          const active_file_path_fs = document.uri.fsPath
          const workspace_root =
            params.workspace_provider.get_workspace_root_for_file(
              active_file_path_fs
            )
          const selected_files: string[] = []

          if (workspace_root) {
            const checked_files = params.workspace_provider.get_checked_files()
            for (const file of checked_files) {
              const file_workspace_root =
                params.workspace_provider.get_workspace_root_for_file(file)
              if (file_workspace_root === workspace_root) {
                const relative_path = normalize_path(
                  path.relative(workspace_root, file)
                )
                selected_files.push(relative_path)
              }
            }
          }

          await show_ghost_text({
            editor,
            position,
            ghost_text: decoded_completion,
            command: workspace_root
              ? {
                  title: 'Code at Cursor Accepted',
                  command: 'codeWebChat.internal.codeAtCursorAccepted',
                  arguments: [
                    {
                      workspace_root,
                      prompt: completion_instructions,
                      file_path: active_file_path_fs,
                      selected_files
                    }
                  ]
                }
              : undefined
          })
        }
        break
      } else {
        force_show_quick_pick = true
        continue
      }
    } catch (err: any) {
      if (axios.isCancel(err)) {
        if (err.message == t('command.code-at-cursor.cancel.cursor-moved')) {
          break
        }
        force_show_quick_pick = true
        continue
      }

      Logger.error({
        function_name: 'perform_code_at_cursor',
        message: 'Completion error',
        data: err
      })
      force_show_quick_pick = true
      continue
    } finally {
      cursor_listener.dispose()
    }
  }
}
