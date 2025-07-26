import * as vscode from 'vscode'
import { FilesCollector } from '../utils/files-collector'
import { Logger } from '../utils/logger'
import { ApiProvidersManager } from '../services/api-providers-manager'
import { make_api_request } from '../utils/make-api-request'
import axios from 'axios'
import { PROVIDERS } from '@shared/constants/providers'
import { DEFAULT_TEMPERATURE } from '@shared/constants/api-tools'
import { LAST_SELECTED_EDIT_CONTEXT_CONFIG_INDEX_STATE_KEY } from '@/constants/state-keys'
import { EditFormat } from '@shared/types/edit-format'

const get_edit_context_config = async (
  api_providers_manager: ApiProvidersManager,
  show_quick_pick: boolean = false,
  context: vscode.ExtensionContext,
  config_index?: number
): Promise<{ provider: any; config: any } | undefined> => {
  const edit_context_configs =
    await api_providers_manager.get_edit_context_tool_configs()

  if (edit_context_configs.length == 0) {
    vscode.window.showErrorMessage('Edit Context API tool is not configured.')
    Logger.warn({
      function_name: 'get_edit_context_config',
      message: 'Edit Context API tool is not configured.'
    })
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
    const create_items = async () => {
      return edit_context_configs.map((config, index) => {
        const description_parts = [config.provider_name]
        if (config.temperature != DEFAULT_TEMPERATURE['edit-context']) {
          description_parts.push(`${config.temperature}`)
        }
        if (config.reasoning_effort) {
          description_parts.push(`${config.reasoning_effort}`)
        }

        return {
          label: config.model,
          description: description_parts.join(' · '),
          config,
          index
        }
      })
    }

    const quick_pick = vscode.window.createQuickPick()
    const items = await create_items()
    quick_pick.items = items
    quick_pick.placeholder = 'Select configuration'
    quick_pick.matchOnDescription = true

    const last_selected_index = context.globalState.get<number>(
      LAST_SELECTED_EDIT_CONTEXT_CONFIG_INDEX_STATE_KEY,
      0
    )

    if (last_selected_index >= 0 && last_selected_index < items.length) {
      quick_pick.activeItems = [items[last_selected_index]]
    } else if (items.length > 0) {
      quick_pick.activeItems = [items[0]]
    }

    return new Promise<{ provider: any; config: any } | undefined>(
      (resolve) => {
        quick_pick.onDidAccept(async () => {
          const selected = quick_pick.selectedItems[0] as any
          quick_pick.hide()

          if (!selected) {
            resolve(undefined)
            return
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

const perform_context_editing = async (params: {
  context: vscode.ExtensionContext
  file_tree_provider: any
  open_editors_provider?: any
  show_quick_pick?: boolean
  instructions?: string
  config_index?: number
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

  const collected_files = await files_collector.collect_files()

  if (!collected_files) {
    vscode.window.showErrorMessage('Unable to work with empty context.')
    return
  }

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

  let edit_context_instructions = ''
  if (selected_text) {
    edit_context_instructions += `\`${current_file_path}\`\n\`\`\`\n${selected_text}\n\`\`\`\n`
  }
  edit_context_instructions += instructions

  const files = `<files>${collected_files}\n</files>`

  const edit_format = params.context.workspaceState.get<EditFormat>(
    'api-edit-format',
    'diff'
  )
  const all_instructions = vscode.workspace
    .getConfiguration('codeWebChat')
    .get<{ [key in EditFormat]: string }>('editFormatInstructions')
  const edit_format_instructions = all_instructions?.[edit_format] ?? ''

  const content = `${edit_context_instructions}\n${edit_format_instructions}\n${files}\n${edit_context_instructions}\n${edit_format_instructions}`

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

  Logger.log({
    function_name: 'perform_context_editing',
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

export const edit_context_commands = (params: {
  context: vscode.ExtensionContext
  workspace_provider: any
  open_editors_provider?: any
}) => {
  return [
    vscode.commands.registerCommand(
      'codeWebChat.editContext',
      async (args?: { instructions?: string; config_index?: number }) =>
        perform_context_editing({
          context: params.context,
          file_tree_provider: params.workspace_provider,
          open_editors_provider: params.open_editors_provider,
          show_quick_pick: false,
          instructions: args?.instructions,
          config_index: args?.config_index
        })
    ),
    vscode.commands.registerCommand(
      'codeWebChat.editContextUsing',
      async (args?: { instructions?: string }) =>
        perform_context_editing({
          context: params.context,
          file_tree_provider: params.workspace_provider,
          open_editors_provider: params.open_editors_provider,
          show_quick_pick: true,
          instructions: args?.instructions
        })
    )
  ]
}
