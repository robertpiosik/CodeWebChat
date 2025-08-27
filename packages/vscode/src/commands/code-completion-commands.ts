import * as vscode from 'vscode'
import axios from 'axios'
import { make_api_request } from '../utils/make-api-request'
import { code_completion_instructions } from '../constants/instructions'
import { FilesCollector } from '../utils/files-collector'
import { ApiProvidersManager } from '../services/api-providers-manager'
import { Logger } from '../utils/logger'
import he from 'he'
import { PROVIDERS } from '@shared/constants/providers'
import { LAST_SELECTED_CODE_COMPLETION_CONFIG_INDEX_STATE_KEY } from '@/constants/state-keys'
import { DEFAULT_TEMPERATURE } from '@shared/constants/api-tools'
import { ToolConfig } from '@/services/api-providers-manager'
import { ViewProvider } from '../view/backend/view-provider'

// Show inline completion using Inline Completions API
const show_inline_completion = async (params: {
  editor: vscode.TextEditor
  position: vscode.Position
  completion_text: string
}) => {
  const document = params.editor.document
  const controller = vscode.languages.registerInlineCompletionItemProvider(
    { pattern: '**' },
    {
      provideInlineCompletionItems: () => {
        const item = {
          insertText: params.completion_text,
          range: new vscode.Range(params.position, params.position)
        }
        return [item]
      }
    }
  )

  const change_listener = vscode.workspace.onDidChangeTextDocument(
    async (e) => {
      if (e.document === document) {
        await vscode.commands.executeCommand(
          'editor.action.formatDocument',
          document.uri
        )
        change_listener.dispose()
      }
    }
  )

  await vscode.commands.executeCommand('editor.action.inlineSuggest.trigger')

  setTimeout(() => {
    controller.dispose()
    change_listener.dispose()
  }, 10000)
}

const get_code_completion_config = async (
  api_providers_manager: ApiProvidersManager,
  show_quick_pick: boolean = false,
  context: vscode.ExtensionContext,
  config_index?: number,
  view_provider?: ViewProvider
): Promise<{ provider: any; config: any } | undefined> => {
  let code_completions_configs =
    await api_providers_manager.get_code_completions_tool_configs()

  if (code_completions_configs.length == 0) {
    vscode.commands.executeCommand('codeWebChat.settings.codeCompletions')
    vscode.window.showInformationMessage(
      'No "Code Completions" configurations found. Please add one in the settings.'
    )
    return
  }

  let selected_config = null

  if (config_index !== undefined && code_completions_configs[config_index]) {
    selected_config = code_completions_configs[config_index]
  } else if (!show_quick_pick) {
    selected_config =
      await api_providers_manager.get_default_code_completions_config()
  }

  if (!selected_config || show_quick_pick) {
    const move_up_button = {
      iconPath: new vscode.ThemeIcon('chevron-up'),
      tooltip: 'Move up'
    }

    const move_down_button = {
      iconPath: new vscode.ThemeIcon('chevron-down'),
      tooltip: 'Move down'
    }

    const set_default_button = {
      iconPath: new vscode.ThemeIcon('pass'),
      tooltip: 'Set as default'
    }

    const unset_default_button = {
      iconPath: new vscode.ThemeIcon('pass-filled'),
      tooltip: 'Unset default'
    }

    const create_items = async () => {
      const default_config =
        await api_providers_manager.get_default_code_completions_config()
      return code_completions_configs.map((config: ToolConfig, index) => {
        const is_default =
          default_config &&
          default_config.provider_type == config.provider_type &&
          default_config.provider_name == config.provider_name &&
          default_config.model == config.model &&
          default_config.temperature == config.temperature &&
          default_config.reasoning_effort == config.reasoning_effort &&
          default_config.max_concurrency == config.max_concurrency

        const description_parts = [config.provider_name]
        if (config.temperature != DEFAULT_TEMPERATURE['code-completions']) {
          description_parts.push(`${config.temperature}`)
        }
        if (config.reasoning_effort) {
          description_parts.push(`${config.reasoning_effort}`)
        }

        let buttons = []
        if (code_completions_configs.length > 1) {
          const is_first_item = index == 0
          const is_last_item = index == code_completions_configs.length - 1

          const navigation_buttons = []
          if (!is_first_item) {
            navigation_buttons.push(move_up_button)
          }
          if (!is_last_item) {
            navigation_buttons.push(move_down_button)
          }

          if (!is_default) {
            buttons = [...navigation_buttons, set_default_button]
          } else {
            buttons = [...navigation_buttons, unset_default_button]
          }
        } else {
          if (!is_default) {
            buttons = [set_default_button]
          } else {
            buttons = [unset_default_button]
          }
        }

        return {
          label: is_default ? `$(check) ${config.model}` : config.model,
          description: description_parts.join(' · '),
          buttons,
          config,
          index
        }
      })
    }

    const quick_pick = vscode.window.createQuickPick()
    quick_pick.items = await create_items()
    quick_pick.placeholder = 'Select code completions configuration'
    quick_pick.matchOnDescription = true

    const last_selected_index = context.workspaceState.get<number>(
      LAST_SELECTED_CODE_COMPLETION_CONFIG_INDEX_STATE_KEY,
      0
    )

    const items = quick_pick.items
    if (last_selected_index >= 0 && last_selected_index < items.length) {
      quick_pick.activeItems = [items[last_selected_index]]
    } else if (items.length > 0) {
      quick_pick.activeItems = [items[0]]
    }

    return new Promise<{ provider: any; config: any } | undefined>(
      (resolve) => {
        quick_pick.onDidTriggerItemButton(async (event) => {
          const item = event.item as any

          if (
            event.button === move_up_button ||
            event.button === move_down_button
          ) {
            const current_index = item.index
            const is_moving_up = event.button === move_up_button

            const min_index = 0
            const max_index = code_completions_configs.length - 1
            const new_index = is_moving_up
              ? Math.max(min_index, current_index - 1)
              : Math.min(max_index, current_index + 1)

            if (new_index == current_index) {
              return
            }

            const reordered_configs = [...code_completions_configs]
            const [moved_config] = reordered_configs.splice(current_index, 1)
            reordered_configs.splice(new_index, 0, moved_config)
            code_completions_configs = reordered_configs
            await api_providers_manager.save_code_completions_tool_configs(
              code_completions_configs
            )

            quick_pick.items = await create_items()
          } else if (event.button === set_default_button) {
            await api_providers_manager.set_default_code_completions_config(
              item.config
            )
            quick_pick.items = await create_items()
          } else if (event.button === unset_default_button) {
            await api_providers_manager.set_default_code_completions_config(
              null
            )
            quick_pick.items = await create_items()
          }
        })

        quick_pick.onDidAccept(async () => {
          const selected = quick_pick.selectedItems[0] as any
          quick_pick.hide()

          if (!selected) {
            resolve(undefined)
            return
          }

          context.workspaceState.update(
            LAST_SELECTED_CODE_COMPLETION_CONFIG_INDEX_STATE_KEY,
            selected.index
          )

          if (view_provider) {
            view_provider.send_message({
              command: 'SELECTED_CONFIGURATION_CHANGED',
              mode: 'code-completions',
              index: selected.index
            })
          }

          const provider = await api_providers_manager.get_provider(
            selected.config.provider_name
          )
          if (!provider) {
            vscode.window.showErrorMessage(
              'API provider for the selected API tool configuration was not found.'
            )
            resolve(undefined)
            return
          }

          resolve({
            provider,
            config: selected.config
          })
        })

        quick_pick.onDidHide(() => {
          quick_pick.dispose()
          resolve(undefined)
        })

        quick_pick.show()
      }
    )
  }

  const provider = await api_providers_manager.get_provider(
    selected_config.provider_name
  )

  if (!provider) {
    vscode.window.showErrorMessage(
      'API provider for the selected API tool configuration was not found.'
    )
    Logger.warn({
      function_name: 'get_code_completion_config',
      message: 'API provider not found for Code Completions tool.'
    })
    return
  }

  return {
    provider,
    config: selected_config
  }
}

const perform_code_completion = async (params: {
  file_tree_provider: any
  open_editors_provider: any
  context: vscode.ExtensionContext
  with_completion_instructions: boolean
  show_quick_pick?: boolean
  completion_instructions?: string
  config_index?: number
  view_provider?: ViewProvider
}) => {
  const api_providers_manager = new ApiProvidersManager(params.context)

  let completion_instructions: string | undefined =
    params.completion_instructions
  if (params.with_completion_instructions && !completion_instructions) {
    const last_value =
      params.context.workspaceState.get<string>(
        'last-completion-instructions'
      ) || ''
    completion_instructions = await vscode.window.showInputBox({
      placeHolder: 'Enter completion instructions',
      prompt: 'E.g. "Include explanatory comments".',
      value: last_value
    })

    if (completion_instructions === undefined) return

    await params.context.workspaceState.update(
      'last-completion-instructions',
      completion_instructions || ''
    )
  }

  const config_result = await get_code_completion_config(
    api_providers_manager,
    params.show_quick_pick,
    params.context,
    params.config_index,
    params.view_provider
  )

  if (!config_result) {
    return
  }

  const { provider, config: code_completions_config } = config_result

  if (!code_completions_config.provider_name) {
    vscode.window.showErrorMessage(
      'API provider is not specified for Code Completions tool.'
    )
    Logger.warn({
      function_name: 'perform_code_completion',
      message: 'API provider is not specified for Code Completions tool.'
    })
    return
  } else if (!code_completions_config.model) {
    vscode.window.showErrorMessage(
      'Model is not specified for Code Completions tool.'
    )
    Logger.warn({
      function_name: 'perform_code_completion',
      message: 'Model is not specified for Code Completions tool.'
    })
    return
  }

  let endpoint_url = ''
  if (provider.type == 'built-in') {
    const provider_info = PROVIDERS[provider.name as keyof typeof PROVIDERS]
    if (!provider_info) {
      vscode.window.showErrorMessage(
        `Built-in provider "${provider.name}" not found.`
      )
      Logger.warn({
        function_name: 'perform_code_completion',
        message: `Built-in provider "${provider.name}" not found.`
      })
      return
    }
    endpoint_url = provider_info.base_url
  } else {
    endpoint_url = provider.base_url
  }

  if (!provider.api_key) {
    vscode.window.showErrorMessage(
      'API key is missing. Please add it in the Settings tab.'
    )
    return
  }

  const editor = vscode.window.activeTextEditor
  if (editor) {
    const cancel_token_source = axios.CancelToken.source()
    const document = editor.document
    const position = editor.selection.active

    const document_path = document.uri.fsPath
    const text_before_cursor = document.getText(
      new vscode.Range(new vscode.Position(0, 0), position)
    )
    const text_after_cursor = document.getText(
      new vscode.Range(position, document.positionAt(document.getText().length))
    )

    const files_collector = new FilesCollector(
      params.file_tree_provider,
      params.open_editors_provider
    )

    const context_text = await files_collector.collect_files({
      exclude_path: document_path
    })

    const payload = {
      before: `<files>\n${context_text}<file path="${vscode.workspace.asRelativePath(
        document.uri
      )}">\n<![CDATA[\n${text_before_cursor}`,
      after: `${text_after_cursor}\n]]>\n</file>\n</files>`
    }

    const content = `${code_completion_instructions}\n${payload.before}${
      completion_instructions
        ? `<missing text>${completion_instructions}</missing text>`
        : '<missing text>'
    }${payload.after}\n${code_completion_instructions}`

    const messages = [
      {
        role: 'user',
        content
      }
    ]

    const body = {
      messages,
      model: code_completions_config.model,
      temperature: code_completions_config.temperature,
      reasoning_effort: code_completions_config.reasoning_effort
    }

    const cursor_listener = vscode.workspace.onDidChangeTextDocument(() => {
      cancel_token_source.cancel('User moved the cursor, cancelling request.')
    })

    vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Waiting for code completion...',
        cancellable: true
      },
      async (_, token) => {
        token.onCancellationRequested(() => {
          cancel_token_source.cancel('User cancelled the operation')
        })

        try {
          const completion = await make_api_request({
            endpoint_url,
            api_key: provider.api_key,
            body,
            cancellation_token: cancel_token_source.token
          })

          if (completion) {
            const match = completion.match(
              /<replacement>([\s\S]*?)<\/replacement>/i
            )
            if (match && match[1]) {
              let decoded_completion = he.decode(match[1].trim())
              decoded_completion = decoded_completion
                .replace(/<!\[CDATA\[/g, '')
                .replace(/\]\]>/g, '')
                .trim()
              await show_inline_completion({
                editor,
                position,
                completion_text: decoded_completion
              })
            }
          }
        } catch (err: any) {
          Logger.error({
            function_name: 'perform_fim_completion',
            message: 'Completion error',
            data: err
          })
        } finally {
          cursor_listener.dispose()
        }
      }
    )
  }
}

export const code_completion_commands = (
  file_tree_provider: any,
  open_editors_provider: any,
  context: vscode.ExtensionContext,
  view_provider: ViewProvider
) => {
  return [
    vscode.commands.registerCommand('codeWebChat.codeCompletion', async () =>
      perform_code_completion({
        file_tree_provider,
        open_editors_provider,
        context,
        with_completion_instructions: false,
        show_quick_pick: false
      })
    ),
    vscode.commands.registerCommand(
      'codeWebChat.codeCompletionWithInstructions',
      async () =>
        perform_code_completion({
          file_tree_provider,
          open_editors_provider,
          context,
          with_completion_instructions: true,
          show_quick_pick: false
        })
    ),
    vscode.commands.registerCommand(
      'codeWebChat.codeCompletionUsing',
      async () =>
        perform_code_completion({
          file_tree_provider,
          open_editors_provider,
          context,
          with_completion_instructions: false,
          show_quick_pick: true,
          view_provider
        })
    ),
    vscode.commands.registerCommand(
      'codeWebChat.codeCompletionWithInstructionsUsing',
      async () =>
        perform_code_completion({
          file_tree_provider,
          open_editors_provider,
          context,
          with_completion_instructions: true,
          show_quick_pick: true,
          view_provider
        })
    )
  ]
}
