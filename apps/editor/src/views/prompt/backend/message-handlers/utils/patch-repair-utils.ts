import * as vscode from 'vscode'
import axios from 'axios'
import {
  ProvidersManager,
  ApiConfiguration,
  Provider
} from '@/services/providers-manager'
import { LAST_USED_PATCH_REPAIR_CONFIG_ID_STATE_KEY } from '@/constants/state-keys'
import { Logger } from '@shared/utils/logger'
import { send_llm_message } from '@/utils/send-llm-message'
import { cleanup_api_response } from '@/utils/cleanup-api-response'
import { patch_repair_task_instructions } from '@/constants/instructions'
import { apply_reasoning_effort } from '@/utils/apply-reasoning-effort'
import { get_api_configuration } from '@/utils/get-api-configuration'

export const get_patch_repair_config = async (params: {
  providers_manager: ProvidersManager
  show_quick_pick?: boolean
  extension_context: vscode.ExtensionContext
}): Promise<
  { provider: Provider; api_configuration: ApiConfiguration } | undefined
> => {
  const result = await get_api_configuration({
    providers_manager: params.providers_manager,
    show_quick_pick: params.show_quick_pick,
    extension_context: params.extension_context,
    last_used_state_key: LAST_USED_PATCH_REPAIR_CONFIG_ID_STATE_KEY,
    default_api_configuration:
      await params.providers_manager.get_default_patch_repair_api_configuration(),
    caller_name: 'get_patch_repair_config'
  })

  if (!result || result === 'back') {
    return undefined
  }

  return {
    provider: result.provider,
    api_configuration: result.api_configuration
  }
}

export const process_file = async (params: {
  base_url: string
  api_key: string
  provider: Provider
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

  const content = `# File\n\n${params.file_content}\n\n# Task\n\n${patch_repair_task_instructions}\n\n${params.instruction}`

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
    provider: params.provider,
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
  } catch (error) {
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
