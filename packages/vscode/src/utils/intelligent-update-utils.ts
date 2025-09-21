import * as vscode from 'vscode'
import axios, { CancelToken } from 'axios'
import {
  ModelProvidersManager,
  ReasoningEffort,
  ToolConfig
} from '@/services/model-providers-manager'
import { LAST_SELECTED_INTELLIGENT_UPDATE_CONFIG_INDEX_STATE_KEY } from '../constants/state-keys'
import { Logger } from '@shared/utils/logger'
import { make_api_request } from './make-api-request'
import { cleanup_api_response } from './cleanup-api-response'
import { refactoring_instruction } from '../constants/instructions'
import { dictionary } from '@/constants/dictionary'

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
          buttons
        }
      })
    }

    const quick_pick = vscode.window.createQuickPick()
    const items = await create_items()
    quick_pick.items = items
    quick_pick.placeholder = 'Select intelligent update configuration'
    quick_pick.matchOnDescription = true

    const last_selected_index = context.globalState.get<number>(
      LAST_SELECTED_INTELLIGENT_UPDATE_CONFIG_INDEX_STATE_KEY,
      0
    )

    if (last_selected_index >= 0 && last_selected_index < items.length) {
      quick_pick.activeItems = [items[last_selected_index]]
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

          context.globalState.update(
            LAST_SELECTED_INTELLIGENT_UPDATE_CONFIG_INDEX_STATE_KEY,
            selected.index
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
  model: string
  temperature: number
  reasoning_effort?: ReasoningEffort
  file_path: string
  file_content: string
  instruction: string
  cancel_token?: CancelToken
  on_chunk?: (tokens_per_second: number, total_tokens: number) => void
}): Promise<string | null> => {
  Logger.info({
    function_name: 'process_file',
    message: 'start',
    data: { file_path: params.file_path }
  })
  const file_content_block = `<file>\n<![CDATA[\n${params.file_content}\n]]>\n</file>`
  const content = `${file_content_block}\n${refactoring_instruction}\n<![CDATA[\n${params.instruction}\n]]>`

  const messages = [
    {
      role: 'user',
      content
    }
  ]

  const body = {
    messages,
    model: params.model,
    temperature: params.temperature,
    reasoning_effort: params.reasoning_effort
  }

  try {
    const refactored_content = await make_api_request({
      endpoint_url: params.endpoint_url,
      api_key: params.api_key,
      body,
      cancellation_token: params.cancel_token,
      on_chunk: params.on_chunk
    })

    if (axios.isCancel(params.cancel_token?.reason)) {
      Logger.info({
        function_name: 'process_file',
        message: 'Request cancelled during API call',
        data: params.file_path
      })
      return null
    }

    if (!refactored_content) {
      vscode.window.showErrorMessage(
        dictionary.error_message.APPLYING_CHANGES_FAILED_EMPTY_RESPONSE(
          params.file_path
        )
      )
      Logger.error({
        function_name: 'process_file',
        message: 'API request returned empty response',
        data: params.file_path
      })
      return null
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
      return null
    }

    Logger.error({
      function_name: 'process_file',
      message: 'Refactoring error',
      data: { error, file_path: params.file_path }
    })
    console.error(`Refactoring error for ${params.file_path}:`, error)
    vscode.window.showErrorMessage(
      dictionary.error_message.ERROR_DURING_REFACTORING(params.file_path)
    )
    return null
  }
}
