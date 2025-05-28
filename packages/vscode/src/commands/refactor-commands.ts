import * as vscode from 'vscode'
import { FilesCollector } from '../helpers/files-collector'
import { Logger } from '../helpers/logger'
import { ApiProvidersManager } from '../services/api-providers-manager'
import { make_api_request } from '../helpers/make-api-request'
import axios from 'axios'
import { PROVIDERS } from '@shared/constants/providers'
import { LAST_SELECTED_FILE_REFACTORING_CONFIG_INDEX_KEY } from '@/constants/state-keys'

const get_refactor_config = async (
  api_providers_manager: ApiProvidersManager,
  show_quick_pick: boolean = false,
  context: vscode.ExtensionContext
): Promise<{ provider: any; config: any } | undefined> => {
  const refactor_configs =
    await api_providers_manager.get_file_refactoring_tool_configs()

  if (refactor_configs.length === 0) {
    vscode.window.showErrorMessage(
      'Refactoring API tool is not configured. Navigate to the Settings tab, configure API providers and setup the API tool.'
    )
    Logger.warn({
      function_name: 'get_refactor_config',
      message: 'Refactoring API tool is not configured.'
    })
    return
  }

  let selected_config = null

  if (!show_quick_pick) {
    selected_config =
      await api_providers_manager.get_default_file_refactoring_config()
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
      iconPath: new vscode.ThemeIcon('star'),
      tooltip: 'Set as default'
    }

    const unset_default_button = {
      iconPath: new vscode.ThemeIcon('star-full'),
      tooltip: 'Unset default'
    }

    const create_items = async () => {
      const default_config =
        await api_providers_manager.get_default_file_refactoring_config()

      return refactor_configs.map((config, index) => {
        const buttons = []

        const is_default =
          default_config &&
          default_config.provider_type == config.provider_type &&
          default_config.provider_name == config.provider_name &&
          default_config.model == config.model

        if (refactor_configs.length > 1) {
          if (index > 0) {
            buttons.push(move_up_button)
          }

          if (index < refactor_configs.length - 1) {
            buttons.push(move_down_button)
          }
        }

        if (is_default) {
          buttons.push(unset_default_button)
        } else {
          buttons.push(set_default_button)
        }

        return {
          label: config.model,
          description: `${config.provider_name}${
            is_default ? ' • default configuration' : ''
          }`,
          config,
          index,
          buttons
        }
      })
    }

    const quick_pick = vscode.window.createQuickPick()
    const items = await create_items()
    quick_pick.items = items
    quick_pick.placeholder = 'Select file refactoring configuration'
    quick_pick.matchOnDescription = true

    const last_selected_index = context.globalState.get<number>(
      LAST_SELECTED_FILE_REFACTORING_CONFIG_INDEX_KEY,
      0
    )

    if (last_selected_index >= 0 && last_selected_index < items.length) {
      quick_pick.activeItems = [items[last_selected_index]]
    } else if (items.length > 0) {
      quick_pick.activeItems = [items[0]]
    }

    return new Promise<{ provider: any; config: any } | undefined>(
      (resolve) => {
        quick_pick.onDidTriggerItemButton(async (event) => {
          const item = event.item as any
          const button = event.button
          const index = item.index

          if (button === set_default_button) {
            await api_providers_manager.set_default_file_refactoring_config(
              refactor_configs[index]
            )
            quick_pick.items = await create_items()
          } else if (button === unset_default_button) {
            await api_providers_manager.set_default_file_refactoring_config(
              null as any
            )
            quick_pick.items = await create_items()
          } else if (button.tooltip == 'Move up' && index > 0) {
            const temp = refactor_configs[index]
            refactor_configs[index] = refactor_configs[index - 1]
            refactor_configs[index - 1] = temp

            await api_providers_manager.save_file_refactoring_tool_configs(
              refactor_configs
            )

            quick_pick.items = await create_items()
          } else if (
            button.tooltip == 'Move down' &&
            index < refactor_configs.length - 1
          ) {
            const temp = refactor_configs[index]
            refactor_configs[index] = refactor_configs[index + 1]
            refactor_configs[index + 1] = temp

            await api_providers_manager.save_file_refactoring_tool_configs(
              refactor_configs
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

          context.globalState.update(
            LAST_SELECTED_FILE_REFACTORING_CONFIG_INDEX_KEY,
            selected.index
          )

          const provider = await api_providers_manager.get_provider(
            selected.config.provider_name
          )
          if (!provider) {
            vscode.window.showErrorMessage(
              'API provider not found for Refactoring tool. Navigate to the Settings tab, configure API providers and setup the API tool.'
            )
            Logger.warn({
              function_name: 'get_refactor_config',
              message: 'API provider not found for Refactoring tool.'
            })
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
      'API provider not found for Refactoring tool. Navigate to the Settings tab, configure API providers and setup the API tool.'
    )
    Logger.warn({
      function_name: 'get_refactor_config',
      message: 'API provider not found for Refactoring tool.'
    })
    return
  }

  return {
    provider,
    config: selected_config
  }
}

const perform_refactoring = async (params: {
  context: vscode.ExtensionContext
  file_tree_provider: any
  open_editors_provider?: any
  show_quick_pick?: boolean
}) => {
  const api_providers_manager = new ApiProvidersManager(params.context)

  const editor = vscode.window.activeTextEditor
  let current_file_path = ''
  let selected_text = ''

  if (editor) {
    const document = editor.document
    current_file_path = vscode.workspace.asRelativePath(document.uri)

    const selection = editor.selection
    selected_text = editor.document.getText(selection)
  }

  const files_collector = new FilesCollector(
    params.file_tree_provider,
    params.open_editors_provider
  )

  const collected_files = await files_collector.collect_files({
    active_path: editor?.document?.uri.fsPath
  })

  if (!collected_files) {
    vscode.window.showErrorMessage('Unable to work with empty context.')
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

  const instructions = await new Promise<string | undefined>((resolve) => {
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

  if (!instructions) {
    return
  }

  const config_result = await get_refactor_config(
    api_providers_manager,
    params.show_quick_pick,
    params.context
  )

  if (!config_result) {
    return
  }

  const { provider, config: refactor_settings } = config_result

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
        `Built-in provider "${provider.name}" not found. Navigate to the Settings tab, configure API providers and setup the API tool.`
      )
      Logger.warn({
        function_name: 'perform_refactor_task',
        message: `Built-in provider "${provider.name}" not found.`
      })
      return
    }
    endpoint_url = provider_info.base_url
  } else {
    endpoint_url = provider.base_url
  }

  let refactor_instructions = ''
  if (selected_text) {
    refactor_instructions += `\`${current_file_path}\`\n\`\`\`\n${selected_text}\n\`\`\`\n`
  }
  refactor_instructions += instructions

  const files = `<files>${collected_files}\n</files>`
  const edit_format_instructions =
    'Whenever proposing a file use the markdown code block syntax. Each code block should be a diff patch. Do not send explanations.'
  const content = `${refactor_instructions}\n${edit_format_instructions}\n${files}\n${refactor_instructions}\n${edit_format_instructions}`

  const messages = [
    {
      role: 'user',
      content
    }
  ]

  const body = {
    messages,
    model: refactor_settings.model,
    temperature: refactor_settings.temperature
  }

  Logger.log({
    function_name: 'perform_refactor_task',
    message: 'refactor Prompt:',
    data: content
  })

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

        return make_api_request(
          endpoint_url,
          provider.api_key,
          body,
          cancel_token_source.token,
          (chunk: string) => {
            total_tokens += Math.ceil(chunk.length / 4)
            progress.report({
              message: `received ${total_tokens} tokens...`
            })
          }
        )
      }
    )

    if (response) {
      vscode.env.clipboard.writeText(response)
      await new Promise((resolve) => setTimeout(resolve, 500))
      await vscode.commands.executeCommand('codeWebChat.applyChatResponse')
    }
  } catch (error) {
    if (axios.isCancel(error)) return
    Logger.error({
      function_name: 'perform_refactor_task',
      message: 'refactor task error',
      data: error
    })
    vscode.window.showErrorMessage(
      'An error occurred during refactor task. See console for details.'
    )
  }
}

export const refactor_commands = (params: {
  context: vscode.ExtensionContext
  workspace_provider: any
  open_editors_provider?: any
}) => {
  return [
    vscode.commands.registerCommand('codeWebChat.refactor', async () =>
      perform_refactoring({
        context: params.context,
        file_tree_provider: params.workspace_provider,
        open_editors_provider: params.open_editors_provider,
        show_quick_pick: false
      })
    ),
    vscode.commands.registerCommand('codeWebChat.refactorUsing', async () =>
      perform_refactoring({
        context: params.context,
        file_tree_provider: params.workspace_provider,
        open_editors_provider: params.open_editors_provider,
        show_quick_pick: true
      })
    )
  ]
}
