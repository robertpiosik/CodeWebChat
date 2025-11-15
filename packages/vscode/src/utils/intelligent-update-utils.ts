import * as vscode from 'vscode'
import axios, { CancelToken } from 'axios'
import {
  ModelProvidersManager,
  ReasoningEffort,
  ToolConfig,
  get_tool_config_id
} from '@/services/model-providers-manager'
import { LAST_SELECTED_INTELLIGENT_UPDATE_CONFIG_ID_STATE_KEY } from '../constants/state-keys'
import { Logger } from '@shared/utils/logger'
import { make_api_request } from './make-api-request'
import { cleanup_api_response } from './cleanup-api-response'
import { intelligent_update_instructions } from '../constants/instructions'
import { dictionary } from '@shared/constants/dictionary'
import { apply_reasoning_effort } from './apply-reasoning-effort'

export const get_intelligent_update_config = async (
  api_providers_manager: ModelProvidersManager,
  show_quick_pick: boolean = false,
  context: vscode.ExtensionContext
): Promise<{ provider: any; config: ToolConfig } | undefined> => {
  const intelligent_update_configs =
    await api_providers_manager.get_intelligent_update_tool_configs()

  if (intelligent_update_configs.length == 0) {
    vscode.commands.executeCommand('codeWebChat.settings')
    vscode.window.showInformationMessage(
      dictionary.information_message.NO_INTELLIGENT_UPDATE_CONFIGURATIONS_FOUND
    )
    return
  }

  let selected_config: ToolConfig | undefined

  if (!show_quick_pick) {
    selected_config =
      await api_providers_manager.get_default_intelligent_update_config()
  }

  if (!selected_config || show_quick_pick) {
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
        await api_providers_manager.get_default_intelligent_update_config()

      return intelligent_update_configs.map((config, index) => {
        const buttons = []

        const is_default =
          default_config &&
          default_config.provider_type == config.provider_type &&
          default_config.provider_name == config.provider_name &&
          default_config.model == config.model

        if (is_default) {
          buttons.push(unset_default_button)
        } else {
          buttons.push(set_default_button)
        }

        return {
          label: config.model,
          description: `${
            config.reasoning_effort ? `${config.reasoning_effort}` : ''
          }${
            config.reasoning_effort
              ? ` · ${config.provider_name}`
              : `${config.provider_name}`
          }`,
          config,
          index,
          id: get_tool_config_id(config),
          buttons
        }
      })
    }

    const quick_pick = vscode.window.createQuickPick()
    const items = await create_items()
    quick_pick.items = items
    quick_pick.placeholder = 'Select intelligent update configuration'
    quick_pick.matchOnDescription = true

    const last_selected_id =
      context.workspaceState.get<string>(
        LAST_SELECTED_INTELLIGENT_UPDATE_CONFIG_ID_STATE_KEY
      ) ??
      context.globalState.get<string>(
        LAST_SELECTED_INTELLIGENT_UPDATE_CONFIG_ID_STATE_KEY
      )
    const last_selected_item = items.find((item) => item.id == last_selected_id)

    if (last_selected_item) {
      quick_pick.activeItems = [last_selected_item]
    } else if (items.length > 0) {
      quick_pick.activeItems = [items[0]]
    }

    return new Promise<{ provider: any; config: ToolConfig } | undefined>(
      (resolve) => {
        quick_pick.onDidTriggerItemButton(async (event) => {
          const item = event.item as any
          const button = event.button
          const index = item.index

          if (button === set_default_button) {
            await api_providers_manager.set_default_intelligent_update_config(
              intelligent_update_configs[index]
            )
            quick_pick.items = await create_items()
          } else if (button === unset_default_button) {
            await api_providers_manager.set_default_intelligent_update_config(
              null as any
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
            LAST_SELECTED_INTELLIGENT_UPDATE_CONFIG_ID_STATE_KEY,
            selected.id
          )
          context.globalState.update(
            LAST_SELECTED_INTELLIGENT_UPDATE_CONFIG_ID_STATE_KEY,
            selected.id
          )

          const provider = await api_providers_manager.get_provider(
            selected.config.provider_name
          )
          if (!provider) {
            vscode.window.showErrorMessage(
              dictionary.error_message.API_PROVIDER_FOR_CONFIG_NOT_FOUND
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
      dictionary.error_message.API_PROVIDER_FOR_CONFIG_NOT_FOUND
    )
    Logger.warn({
      function_name: 'get_intelligent_update_config',
      message: 'API provider not found for Intelligent Update API tool.'
    })
    return
  }

  return {
    provider,
    config: selected_config
  }
}

export const process_file = async (params: {
  endpoint_url: string
  api_key: string
  provider: any
  model: string
  temperature: number
  reasoning_effort?: ReasoningEffort
  file_path: string
  file_content: string
  instruction: string
  cancel_token?: CancelToken
  on_chunk?: (tokens_per_second: number, total_tokens: number) => void
  on_thinking_chunk?: (text: string) => void
  on_retry?: (attempt: number, error: any) => void
  on_retry_attempt?: () => void
}): Promise<string> => {
  Logger.info({
    function_name: 'process_file',
    message: 'start',
    data: { file_path: params.file_path }
  })
  const file_content_block = `<file>\n<![CDATA[\n${params.file_content}\n]]>\n</file>`
  const content = `${file_content_block}\n${intelligent_update_instructions}\n<![CDATA[\n${params.instruction}\n]]>`

  const messages = [
    {
      role: 'user',
      content
    }
  ]

  const body: { [key: string]: any } = {
    messages,
    model: params.model,
    temperature: params.temperature
  }

  apply_reasoning_effort(body, params.provider, params.reasoning_effort)

  let attempt = 0
  // eslint-disable-next-line no-constant-condition
  while (true) {
    attempt++
    try {
      const result = await make_api_request({
        endpoint_url: params.endpoint_url,
        api_key: params.api_key,
        body,
        cancellation_token: params.cancel_token,
        on_chunk: params.on_chunk,
        on_thinking_chunk: params.on_thinking_chunk
      })

      const refactored_content = result?.response
      if (!refactored_content) {
        Logger.error({
          function_name: 'process_file',
          message: 'API request returned empty response',
          data: { file_path: params.file_path, attempt }
        })
        throw new Error('API request returned empty response')
      }

      const cleaned_content = cleanup_api_response({
        content: refactored_content
      })
      Logger.info({
        function_name: 'process_file',
        message: 'API response received and cleaned',
        data: {
          file_path: params.file_path,
          response_length: cleaned_content?.length
        }
      })
      return cleaned_content
    } catch (error: any) {
      if (axios.isCancel(error)) {
        Logger.info({
          function_name: 'process_file',
          message: 'Request cancelled',
          data: params.file_path
        })
        throw error
      }

      Logger.error({
        function_name: 'process_file',
        message: `Refactoring error (attempt ${attempt})`,
        data: { error, file_path: params.file_path }
      })
      console.error(
        `Refactoring error for ${params.file_path} (attempt ${attempt}):`,
        error
      )
      params.on_retry?.(attempt, error)
      await new Promise((resolve) => setTimeout(resolve, 5000))
    }
  }
}
