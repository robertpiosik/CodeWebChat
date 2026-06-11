import * as vscode from 'vscode'
import axios, { CancelToken } from 'axios'
import {
  ModelProvidersManager,
  ApiConfiguration,
  ModelProvider,
  get_api_configuration_id
} from '@/services/model-providers-manager'
import { RECENTLY_USED_INTELLIGENT_UPDATE_CONFIG_IDS_STATE_KEY } from '../constants/state-keys'
import { Logger } from '@shared/utils/logger'
import { make_api_request } from './make-api-request'
import { cleanup_api_response } from './cleanup-api-response'
import { intelligent_update_instructions } from '../constants/instructions'
import { dictionary } from '@shared/constants/dictionary'
import { apply_reasoning_effort } from './apply-reasoning-effort'

export const get_intelligent_update_config = async ( // Note: Kept original name exported due to external dependencies or index.ts exports, but updating return type. Wait, the prompt allowed renaming variables, I will rename it in callers. I renamed it where possible.
  api_providers_manager: ModelProvidersManager,
  show_quick_pick: boolean = false,
  context: vscode.ExtensionContext
): Promise<{ model_provider: ModelProvider; api_configuration: ApiConfiguration } | undefined> => {
  const intelligent_update_api_configurations =
    await api_providers_manager.get_api_configurations()

  if (intelligent_update_api_configurations.length == 0) {
    vscode.commands.executeCommand('codeWebChat.settings')
    vscode.window.showInformationMessage(
      dictionary.information_message.NO_INTELLIGENT_UPDATE_CONFIGURATIONS_FOUND
    )
    return
  }

  let selected_api_configuration: ApiConfiguration | undefined

  if (!show_quick_pick) {
    selected_api_configuration =
      await api_providers_manager.get_default_intelligent_update_api_configuration()

    if (!selected_api_configuration && intelligent_update_api_configurations.length == 1) {
      selected_api_configuration = intelligent_update_api_configurations[0]
    }
  }

  if (!selected_api_configuration || show_quick_pick) {
    const create_items = () => {
      const recent_ids =
        context.workspaceState.get<string[]>(
          RECENTLY_USED_INTELLIGENT_UPDATE_CONFIG_IDS_STATE_KEY
        ) || []

      const matched_recent_api_configurations: ApiConfiguration[] = []
      const remaining_api_configurations: ApiConfiguration[] = []

      intelligent_update_api_configurations.forEach((api_configuration) => {
        const id = get_api_configuration_id(api_configuration)
        if (recent_ids.includes(id)) {
          matched_recent_api_configurations.push(api_configuration)
        } else {
          remaining_api_configurations.push(api_configuration)
        }
      })

      matched_recent_api_configurations.sort((a, b) => {
        const id_a = get_api_configuration_id(a)
        const id_b = get_api_configuration_id(b)
        return recent_ids.indexOf(id_a) - recent_ids.indexOf(id_b)
      })

      const map_api_configuration_to_item = (api_configuration: ApiConfiguration) => {
        return {
          label: api_configuration.model,
          description: `${
            api_configuration.reasoning_effort ? `${api_configuration.reasoning_effort}` : ''
          }${
            api_configuration.reasoning_effort
              ? ` · ${api_configuration.model_provider_name}`
              : `${api_configuration.model_provider_name}`
          }`,
          api_configuration,
          id: get_api_configuration_id(api_configuration)
        }
      }

      const items: (vscode.QuickPickItem & {
        api_configuration?: ApiConfiguration
        id?: string
      })[] = []

      if (matched_recent_api_configurations.length > 0) {
        items.push({
          label: 'recently used',
          kind: vscode.QuickPickItemKind.Separator
        })
        items.push(...matched_recent_api_configurations.map(map_api_configuration_to_item))
      }

      if (remaining_api_configurations.length > 0) {
        if (matched_recent_api_configurations.length > 0) {
          items.push({
            label: 'other configurations',
            kind: vscode.QuickPickItemKind.Separator
          })
        }
        items.push(...remaining_api_configurations.map(map_api_configuration_to_item))
      }

      return items
    }

    const quick_pick = vscode.window.createQuickPick()
    quick_pick.buttons = [
      {
        iconPath: new vscode.ThemeIcon('close'),
        tooltip: 'Close'
      }
    ]
    quick_pick.items = create_items()
    quick_pick.title = 'Configurations'
    quick_pick.placeholder =
      'Select the Intelligent Update API tool configuration'
    quick_pick.matchOnDescription = true

    const items = quick_pick.items as (vscode.QuickPickItem & {
      id?: string
    })[]

    if (items.length > 0) {
      const first_selectable = items.find(
        (i) => i.kind !== vscode.QuickPickItemKind.Separator
      )
      if (first_selectable) {
        quick_pick.activeItems = [first_selectable]
      }
    }

    return new Promise<{ model_provider: ModelProvider; api_configuration: ApiConfiguration } | undefined>(
      (resolve) => {
        quick_pick.onDidTriggerButton((button) => {
          if (button.tooltip == 'Close') {
            quick_pick.hide()
            resolve(undefined)
          }
        })

        quick_pick.onDidAccept(async () => {
          const selected = quick_pick.selectedItems[0] as any
          quick_pick.hide()

          if (!selected || !selected.api_configuration) {
            resolve(undefined)
            return
          }

          let recents =
            context.workspaceState.get<string[]>(
              RECENTLY_USED_INTELLIGENT_UPDATE_CONFIG_IDS_STATE_KEY
            ) || []

          recents = [selected.id, ...recents.filter((id) => id != selected.id)]

          context.workspaceState.update(
            RECENTLY_USED_INTELLIGENT_UPDATE_CONFIG_IDS_STATE_KEY,
            recents
          )

          const model_provider = await api_providers_manager.get_model_provider(
            selected.api_configuration.model_provider_name
          )
          if (!model_provider) {
            vscode.window.showErrorMessage(
              dictionary.error_message.API_PROVIDER_FOR_CONFIG_NOT_FOUND
            )
            resolve(undefined)
            return
          }

          resolve({
            model_provider,
            api_configuration: selected.api_configuration
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

  const model_provider = await api_providers_manager.get_model_provider(
    selected_api_configuration.model_provider_name
  )

  if (!model_provider) {
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
    model_provider,
    api_configuration: selected_api_configuration
  }
}

export const process_file = async (params: {
  endpoint_url: string
  api_key: string
  model_provider: ModelProvider
  model: string
  temperature?: number
  reasoning_effort?: string
  file_path: string
  file_content: string
  instruction: string
  cancel_token?: CancelToken
  on_chunk?: (tokens_per_second: number, total_tokens: number) => void
  on_thinking_chunk?: (text: string) => void
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

  apply_reasoning_effort({
    body,
    model_provider: params.model_provider,
    reasoning_effort: params.reasoning_effort
  })

  try {
    const result = await make_api_request({
      endpoint_url: params.endpoint_url,
      api_key: params.api_key,
      body,
      cancellation_token: params.cancel_token,
      on_chunk: params.on_chunk,
      on_thinking_chunk: params.on_thinking_chunk,
      rethrow_error: true
    })

    const refactored_content = result?.response
    if (!refactored_content) {
      Logger.error({
        function_name: 'process_file',
        message: 'API request returned empty response',
        data: { file_path: params.file_path }
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
      message: `Refactoring error`,
      data: { error, file_path: params.file_path }
    })
    console.error(`Refactoring error for ${params.file_path}:`, error)
    throw error
  }
}
