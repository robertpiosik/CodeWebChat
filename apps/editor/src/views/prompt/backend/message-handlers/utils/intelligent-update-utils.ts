import * as vscode from 'vscode'
import axios from 'axios'
import {
  ModelProvidersManager,
  ApiConfiguration,
  ModelProvider
} from '@/services/model-providers-manager'
import { LAST_USED_INTELLIGENT_UPDATE_CONFIG_ID_STATE_KEY } from '@/constants/state-keys'
import { Logger } from '@shared/utils/logger'
import { send_llm_message } from '@/utils/send-llm-message'
import { cleanup_api_response } from '@/utils/cleanup-api-response'
import { intelligent_update_task_instructions } from '@/constants/instructions'
import { t } from '@/i18n'
import { apply_reasoning_effort } from '@/utils/apply-reasoning-effort'
import {
  show_configuration_quick_pick,
  map_api_configuration_to_item
} from '@/utils/show-configuration-quick-pick'

export const get_intelligent_update_config = async (
  model_providers_manager: ModelProvidersManager,
  show_quick_pick: boolean = false,
  extension_context: vscode.ExtensionContext
): Promise<
  | { model_provider: ModelProvider; api_configuration: ApiConfiguration }
  | undefined
> => {
  const intelligent_update_api_configurations =
    await model_providers_manager.get_api_configurations()

  if (intelligent_update_api_configurations.length == 0) {
    vscode.commands.executeCommand('codeWebChat.settings')
    vscode.window.showInformationMessage(t('common.no-configurations-found'))
    return
  }

  let selected_api_configuration: ApiConfiguration | undefined

  if (!show_quick_pick) {
    selected_api_configuration =
      await model_providers_manager.get_default_intelligent_update_api_configuration()

    if (
      !selected_api_configuration &&
      intelligent_update_api_configurations.length == 1
    ) {
      selected_api_configuration = intelligent_update_api_configurations[0]
    }
  }

  if (!selected_api_configuration || show_quick_pick) {
    const last_selected_id = extension_context.workspaceState.get<string>(
      LAST_USED_INTELLIGENT_UPDATE_CONFIG_ID_STATE_KEY
    )

    const result = await show_configuration_quick_pick({
      items: intelligent_update_api_configurations,
      map_item: map_api_configuration_to_item,
      last_selected_id,
      placeholder: 'Select the Intelligent Update API tool configuration'
    })

    if (!result || result === 'back') {
      return undefined
    }

    const { item: api_configuration, id } = result

    extension_context.workspaceState.update(
      LAST_USED_INTELLIGENT_UPDATE_CONFIG_ID_STATE_KEY,
      id
    )

    selected_api_configuration = api_configuration
  }

  const model_provider = await model_providers_manager.get_model_provider(
    selected_api_configuration.model_provider_name
  )

  if (!model_provider) {
    vscode.window.showErrorMessage(t('common.error.api-provider-not-found'))
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
  base_url: string
  api_key: string
  model_provider: ModelProvider
  model: string
  reasoning_effort?: string
  file_path: string
  file_content: string
  instruction: string
  abort_signal?: AbortSignal
  on_chunk?: (tokens_per_second: number, total_tokens: number) => void
  on_thinking_chunk?: (text: string) => void
}): Promise<string> => {
  Logger.info({
    function_name: 'process_file',
    message: 'start',
    data: {
      file_path: params.file_path
    }
  })

  const content = `# File\n\n${params.file_content}\n\n# Task\n\n${intelligent_update_task_instructions}\n\n# Changes\n\n${params.instruction}`

  const messages = [
    {
      role: 'user',
      content
    }
  ]

  const body: { [key: string]: any } = {
    messages,
    model: params.model
  }

  apply_reasoning_effort({
    body,
    model_provider: params.model_provider,
    reasoning_effort: params.reasoning_effort
  })

  try {
    const result = await send_llm_message({
      base_url: params.base_url,
      api_key: params.api_key,
      body,
      abort_signal: params.abort_signal,
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

    const final_content = cleaned_content

    Logger.info({
      function_name: 'process_file',
      message: 'API response received and cleaned',
      data: {
        file_path: params.file_path,
        response_length: final_content?.length
      }
    })
    return final_content
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
