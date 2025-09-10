import * as vscode from 'vscode'
import { FilesCollector } from '@/utils/files-collector'
import { Logger } from '@shared/utils/logger'
import { ApiProvidersManager } from '@/services/api-providers-manager'
import { make_api_request } from '@/utils/make-api-request'
import axios from 'axios'
import { PROVIDERS } from '@shared/constants/providers'
import { DEFAULT_TEMPERATURE } from '@shared/constants/api-tools'
import { LAST_SELECTED_EDIT_CONTEXT_CONFIG_INDEX_STATE_KEY } from '@/constants/state-keys'
import { EditFormat } from '@shared/types/edit-format'
import { ToolConfig } from '@/services/api-providers-manager'
import { extract_file_paths_from_instruction } from '@/utils/extract-file-paths-from-instruction'
import { replace_changes_placeholder } from '@/view/backend/utils/replace-changes-placeholder'
import { replace_saved_context_placeholder } from '@/utils/replace-saved-context-placeholder'
import { replace_selection_placeholder } from '@/view/backend/utils/replace-selection-placeholder'
import { ViewProvider } from '@/view/backend/view-provider'
import { EditContextMessage } from '@/view/types/messages'

const get_edit_context_config = async (
  api_providers_manager: ApiProvidersManager,
  show_quick_pick: boolean = false,
  context: vscode.ExtensionContext,
  config_index?: number,
  view_provider?: ViewProvider
): Promise<{ provider: any; config: any } | undefined> => {
  let edit_context_configs =
    await api_providers_manager.get_edit_context_tool_configs()

  if (edit_context_configs.length == 0) {
    vscode.commands.executeCommand('codeWebChat.settings.editContext')
    vscode.window.showInformationMessage(
      'No "Edit Context" configurations found. Please add one in the settings.'
    )
    return
  }

  let selected_config = null

  if (config_index !== undefined && edit_context_configs[config_index]) {
    selected_config = edit_context_configs[config_index]
    context.workspaceState.update(
      LAST_SELECTED_EDIT_CONTEXT_CONFIG_INDEX_STATE_KEY,
      config_index
    )

    if (view_provider) {
      view_provider.send_message({
        command: 'SELECTED_CONFIGURATION_CHANGED',
        mode: 'edit-context',
        index: config_index
      })
    }
  } else if (!show_quick_pick) {
    const last_selected_index = context.workspaceState.get<number>(
      LAST_SELECTED_EDIT_CONTEXT_CONFIG_INDEX_STATE_KEY
    )
    if (
      last_selected_index !== undefined &&
      edit_context_configs[last_selected_index]
    ) {
      selected_config = edit_context_configs[last_selected_index]
    }
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

    const create_items = async () => {
      return edit_context_configs.map((config: ToolConfig, index) => {
        const description_parts = [config.provider_name]
        if (config.temperature != DEFAULT_TEMPERATURE['edit-context']) {
          description_parts.push(`${config.temperature}`)
        }
        if (config.reasoning_effort) {
          description_parts.push(`${config.reasoning_effort}`)
        }
        if (config.instructions_placement == 'below-only') {
          description_parts.push('cache-enabled')
        }

        let buttons: any = []
        if (edit_context_configs.length > 1) {
          const is_first_item = index == 0
          const is_last_item = index == edit_context_configs.length - 1

          const navigation_buttons = []
          if (!is_first_item) {
            navigation_buttons.push(move_up_button)
          }
          if (!is_last_item) {
            navigation_buttons.push(move_down_button)
          }

          buttons = navigation_buttons
        }

        return {
          label: config.model,
          description: description_parts.join(' · '),
          buttons,
          config,
          index
        }
      })
    }

    const quick_pick = vscode.window.createQuickPick()
    quick_pick.items = await create_items()
    quick_pick.placeholder = 'Select configuration'
    quick_pick.matchOnDescription = true

    const last_selected_index = context.workspaceState.get<number>(
      LAST_SELECTED_EDIT_CONTEXT_CONFIG_INDEX_STATE_KEY,
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
        let accepted = false

        quick_pick.onDidTriggerItemButton(async (event) => {
          const item = event.item as any

          if (
            event.button === move_up_button ||
            event.button === move_down_button
          ) {
            const current_index = item.index
            const is_moving_up = event.button === move_up_button

            const min_index = 0
            const max_index = edit_context_configs.length - 1
            const new_index = is_moving_up
              ? Math.max(min_index, current_index - 1)
              : Math.min(max_index, current_index + 1)

            if (new_index == current_index) {
              return
            }

            const reordered_configs = [...edit_context_configs]
            const [moved_config] = reordered_configs.splice(current_index, 1)
            reordered_configs.splice(new_index, 0, moved_config)
            edit_context_configs = reordered_configs
            await api_providers_manager.save_edit_context_tool_configs(
              edit_context_configs
            )

            quick_pick.items = await create_items()
          }
        })

        quick_pick.onDidAccept(async () => {
          accepted = true
          const selected = quick_pick.selectedItems[0] as any
          quick_pick.hide()

          if (!selected) {
            resolve(undefined)
            return
          }

          context.workspaceState.update(
            LAST_SELECTED_EDIT_CONTEXT_CONFIG_INDEX_STATE_KEY,
            selected.index
          )

          if (view_provider) {
            view_provider.send_message({
              command: 'SELECTED_CONFIGURATION_CHANGED',
              mode: 'edit-context',
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
          if (!accepted) {
            resolve(undefined)
          }
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
      function_name: 'get_edit_context_config',
      message: 'API provider not found for Edit Context tool.'
    })
    return
  }

  return {
    provider,
    config: selected_config
  }
}

export const perform_context_editing = async (params: {
  context: vscode.ExtensionContext
  file_tree_provider: any
  open_editors_provider?: any
  show_quick_pick?: boolean
  instructions?: string
  config_index?: number
  view_provider?: ViewProvider
}) => {
  const api_providers_manager = new ApiProvidersManager(params.context)

  const editor = vscode.window.activeTextEditor

  const files_collector = new FilesCollector(
    params.file_tree_provider,
    params.open_editors_provider
  )

  let instructions: string | undefined

  if (params.instructions) {
    instructions = params.instructions
  } else {
    const initial_context = await files_collector.collect_files({})
    if (!initial_context) {
      vscode.window.showWarningMessage('Unable to work without context.')
      return
    }

    const last_chat_prompt =
      params.context.workspaceState.get<string>('last-chat-prompt') || ''

    const input_box = vscode.window.createInputBox()
    input_box.placeholder = 'Enter instructions'
    input_box.value = last_chat_prompt

    input_box.onDidChangeValue(async (value) => {
      await params.context.workspaceState.update('last-chat-prompt', value)
    })

    instructions = await new Promise<string | undefined>((resolve) => {
      input_box.onDidAccept(() => {
        const value = input_box.value.trim()
        if (value.length === 0) {
          vscode.window.showErrorMessage('Instruction cannot be empty')
          return
        }
        resolve(value)
        input_box.hide()
      })
      input_box.onDidHide(() => resolve(undefined))
      input_box.show()
    })
  }

  if (!instructions) {
    return
  }

  if (editor && !editor.selection.isEmpty) {
    if (instructions.includes('#Selection')) {
      instructions = replace_selection_placeholder(instructions)
    }
  }

  let pre_context_instructions = instructions
  let post_context_instructions = instructions

  if (pre_context_instructions.includes('#Changes:')) {
    pre_context_instructions = await replace_changes_placeholder({
      instruction: pre_context_instructions
    })
  }

  if (pre_context_instructions.includes('#SavedContext:')) {
    pre_context_instructions = await replace_saved_context_placeholder({
      instruction: pre_context_instructions,
      context: params.context,
      workspace_provider: params.file_tree_provider
    })
    post_context_instructions = await replace_saved_context_placeholder({
      instruction: post_context_instructions,
      context: params.context,
      workspace_provider: params.file_tree_provider,
      just_opening_tag: true
    })
  }

  const additional_paths = extract_file_paths_from_instruction(instructions)

  const collected_files = await files_collector.collect_files({
    additional_paths
  })

  if (!collected_files) {
    vscode.window.showWarningMessage('Unable to work with empty context.')
    return
  }

  const config_result = await get_edit_context_config(
    api_providers_manager,
    params.show_quick_pick,
    params.context,
    params.config_index,
    params.view_provider
  )

  if (!config_result) {
    return
  }

  const { provider, config: edit_context_config } = config_result

  if (!provider.api_key) {
    vscode.window.showErrorMessage(
      'API key is missing. Please add it in the Settings tab.'
    )
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
        function_name: 'perform_context_editing',
        message: `Built-in provider "${provider.name}" not found.`
      })
      return
    }
    endpoint_url = provider_info.base_url
  } else {
    endpoint_url = provider.base_url
  }

  const files = `<files>${collected_files}\n</files>`

  const edit_format = params.context.workspaceState.get<EditFormat>(
    'api-edit-format',
    'diff'
  )
  const all_instructions = vscode.workspace
    .getConfiguration('codeWebChat')
    .get<{ [key in EditFormat]: string }>('editFormatInstructions')
  const edit_format_instructions = all_instructions?.[edit_format] ?? ''

  if (edit_format_instructions) {
    const system_instructions = `<system>\n${edit_format_instructions}\n</system>`
    pre_context_instructions += `\n${system_instructions}`
    post_context_instructions += `\n${system_instructions}`
  }

  // Use instructions placement setting to determine message structure
  const instructions_placement =
    edit_context_config.instructions_placement || 'above-and-below'
  let content: string
  if (instructions_placement === 'below-only') {
    // Place instructions only below context for better caching
    content = `${files}\n${post_context_instructions}`
  } else {
    // Default: place instructions above and below context for better adherence
    content = `${pre_context_instructions}\n${files}\n${post_context_instructions}`
  }

  const messages = [
    {
      role: 'system',
      content:
        'You are an AI programming assistant. Do not include any explanations or other text.'
    },
    {
      role: 'user',
      content
    }
  ]

  const body = {
    messages,
    model: edit_context_config.model,
    temperature: edit_context_config.temperature,
    reasoning_effort: edit_context_config.reasoning_effort
  }

  const cancel_token_source = axios.CancelToken.source()

  try {
    const response = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Waiting for response',
        cancellable: true
      },
      async (progress, token) => {
        token.onCancellationRequested(() => {
          cancel_token_source.cancel('Cancelled by user.')
        })

        let wait_time = 0
        let has_started_receiving = false

        const wait_timer = setInterval(() => {
          if (!has_started_receiving) {
            progress.report({
              message: `${(wait_time / 10).toFixed(1)}s`
            })
            wait_time++
          }
        }, 100)

        try {
          return await make_api_request({
            endpoint_url,
            api_key: provider.api_key,
            body,
            cancellation_token: cancel_token_source.token,
            on_chunk: (formatted_tokens, formatted_tokens_per_second) => {
              if (!has_started_receiving) {
                has_started_receiving = true
                clearInterval(wait_timer)
              }

              progress.report({
                message: `streamed ${formatted_tokens} tokens at ~${formatted_tokens_per_second} tokens/s`
              })
            }
          })
        } finally {
          clearInterval(wait_timer)
        }
      }
    )

    if (response) {
      await vscode.commands.executeCommand('codeWebChat.applyChatResponse', {
        response: response
      })
    }
  } catch (error) {
    if (axios.isCancel(error)) return
    Logger.error({
      function_name: 'perform_context_editing',
      message: 'refactor task error',
      data: error
    })
    vscode.window.showErrorMessage(
      'An error occurred during refactor task. See console for details.'
    )
  }
}

export const handle_edit_context = async (
  provider: ViewProvider,
  message: EditContextMessage
): Promise<void> => {
  perform_context_editing({
    context: provider.context,
    file_tree_provider: provider.workspace_provider,
    open_editors_provider: provider.open_editors_provider,
    show_quick_pick: message.use_quick_pick,
    instructions: provider.edit_instructions,
    config_index: message.config_index,
    view_provider: provider
  })
}
