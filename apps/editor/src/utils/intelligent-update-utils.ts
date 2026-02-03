import * as vscode from 'vscode'
import axios, { CancelToken } from 'axios'
import {
  ModelProvidersManager,
  ReasoningEffort,
  ToolConfig,
  get_tool_config_id
} from '@/services/model-providers-manager'
import { RECENTLY_USED_INTELLIGENT_UPDATE_CONFIG_IDS_STATE_KEY } from '../constants/state-keys'
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
    const recents = context.workspaceState.get<string[]>(
      RECENTLY_USED_INTELLIGENT_UPDATE_CONFIG_IDS_STATE_KEY
    )
    const last_selected_id = recents?.[0]

    if (last_selected_id) {
      selected_config = intelligent_update_configs.find(
        (c) => get_tool_config_id(c) == last_selected_id
      )
    }

    if (!selected_config) {
      selected_config =
        await api_providers_manager.get_default_intelligent_update_config()
    }
  }

  if (!selected_config || show_quick_pick) {
    const create_items = () => {
      const recent_ids =
        context.workspaceState.get<string[]>(
          RECENTLY_USED_INTELLIGENT_UPDATE_CONFIG_IDS_STATE_KEY
        ) || []

      const matched_recent_configs: ToolConfig[] = []
      const remaining_configs: ToolConfig[] = []

      intelligent_update_configs.forEach((config) => {
        const id = get_tool_config_id(config)
        if (recent_ids.includes(id)) {
          matched_recent_configs.push(config)
        } else {
          remaining_configs.push(config)
        }
      })

      matched_recent_configs.sort((a, b) => {
        const id_a = get_tool_config_id(a)
        const id_b = get_tool_config_id(b)
        return recent_ids.indexOf(id_a) - recent_ids.indexOf(id_b)
      })

      const map_config_to_item = (config: ToolConfig) => {
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
          id: get_tool_config_id(config)
        }
      }

      const items: (vscode.QuickPickItem & {
        config?: ToolConfig
        id?: string
      })[] = []

      if (matched_recent_configs.length > 0) {
        items.push({
          label: 'recently used',
          kind: vscode.QuickPickItemKind.Separator
        })
        items.push(...matched_recent_configs.map(map_config_to_item))
      }

      if (remaining_configs.length > 0) {
        if (matched_recent_configs.length > 0) {
          items.push({
            label: 'other configurations',
            kind: vscode.QuickPickItemKind.Separator
          })
        }
        items.push(...remaining_configs.map(map_config_to_item))
      }

      return items
    }

    const quick_pick = vscode.window.createQuickPick()
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

    return new Promise<{ provider: any; config: ToolConfig } | undefined>(
      (resolve) => {
        quick_pick.onDidAccept(async () => {
          const selected = quick_pick.selectedItems[0] as any
          quick_pick.hide()

          if (!selected || !selected.config) {
            resolve(undefined)
            return
          }

          let recents =
            context.workspaceState.get<string[]>(
              RECENTLY_USED_INTELLIGENT_UPDATE_CONFIG_IDS_STATE_KEY
            ) || []

          recents = [selected.id, ...recents.filter((id) => id !== selected.id)]

          context.workspaceState.update(
            RECENTLY_USED_INTELLIGENT_UPDATE_CONFIG_IDS_STATE_KEY,
            recents
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
  temperature?: number
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

  const MAX_ATTEMPTS = 3
  let attempt = 0
  while (attempt < MAX_ATTEMPTS) {
    attempt++
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

      const is_retryable_error =
        (axios.isAxiosError(error) &&
          (error.response?.status == 429 ||
            (error.response?.status && error.response.status >= 500))) ||
        error.name == 'StreamAbortError'

      if (!is_retryable_error) {
        Logger.error({
          function_name: 'process_file',
          message: `Refactoring error (attempt ${attempt}) - not retrying`,
          data: { error, file_path: params.file_path }
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

      if (attempt >= MAX_ATTEMPTS) {
        throw error
      }

      params.on_retry?.(attempt, error)
      await new Promise((resolve) => setTimeout(resolve, 3000))
      params.on_retry_attempt?.()
    }
  }
  throw new Error('Processing file failed after maximum attempts')
}
