import * as vscode from 'vscode'
import { FilesCollector } from '@/utils/files-collector'
import { Logger } from '@/utils/logger'
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
  config_index?: number
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
  } else if (!show_quick_pick) {
    selected_config =
      await api_providers_manager.get_default_edit_context_config()
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
        await api_providers_manager.get_default_edit_context_config()
      return edit_context_configs.map((config: ToolConfig, index) => {
        const is_default =
          default_config &&
          default_config.provider_type == config.provider_type &&
          default_config.provider_name == config.provider_name &&
          default_config.model == config.model &&
          default_config.temperature == config.temperature &&
          default_config.reasoning_effort == config.reasoning_effort &&
          default_config.max_concurrency == config.max_concurrency

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

        let buttons = []
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
    quick_pick.placeholder = 'Select configuration'
    quick_pick.matchOnDescription = true

    const last_selected_index = context.globalState.get<number>(
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
          } else if (event.button === set_default_button) {
            await api_providers_manager.set_default_edit_context_config(
              item.config
            )
            quick_pick.items = await create_items()
          } else if (event.button === unset_default_button) {
            await api_providers_manager.set_default_edit_context_config(null)
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

          const default_config =
            await api_providers_manager.get_default_edit_context_config()
          if (!default_config) {
            await api_providers_manager.set_default_edit_context_config(
              selected.config
            )
          }

          context.globalState.update(
            LAST_SELECTED_EDIT_CONTEXT_CONFIG_INDEX_STATE_KEY,
            selected.index
          )

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
}) => {
  const api_providers_manager = new ApiProvidersManager(params.context)

  const editor = vscode.window.activeTextEditor

  let instructions: string | undefined

  if (params.instructions) {
    instructions = params.instructions
  } else {
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
    pre_context_instructions = await replace_changes_placeholder(
      pre_context_instructions
    )
  }

  if (pre_context_instructions.includes('#SavedContext:')) {
    pre_context_instructions = await replace_saved_context_placeholder(
      pre_context_instructions,
      params.context,
      params.file_tree_provider
    )
    post_context_instructions = await replace_saved_context_placeholder(
      post_context_instructions,
      params.context,
      params.file_tree_provider,
      true
    )
  }

  const files_collector = new FilesCollector(
    params.file_tree_provider,
    params.open_editors_provider
  )

  const additional_paths = extract_file_paths_from_instruction(instructions)

  const collected_files = await files_collector.collect_files({
    additional_paths
  })

  if (!collected_files) {
    vscode.window.showErrorMessage('Unable to work with empty context.')
    return
  }

  const config_result = await get_edit_context_config(
    api_providers_manager,
    params.show_quick_pick,
    params.context,
    params.config_index
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
    pre_context_instructions += `\n${edit_format_instructions}`
    post_context_instructions += `\n${edit_format_instructions}`
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

        let total_tokens = 0

        return make_api_request({
          endpoint_url,
          api_key: provider.api_key,
          body,
          cancellation_token: cancel_token_source.token,
          on_chunk: (chunk: string) => {
            total_tokens += Math.ceil(chunk.length / 4)
            progress.report({
              message: `received ${total_tokens} tokens...`
            })
          }
        })
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
    config_index: message.config_index
  })
}
