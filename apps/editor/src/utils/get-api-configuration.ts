import * as vscode from 'vscode'
import {
  ProvidersManager,
  get_api_configuration_id,
  Provider,
  ApiConfiguration
} from '@/services/providers-manager'
import { Logger } from '@shared/utils/logger'
import { t } from '@/i18n'
import { show_configurations_quick_pick } from '@/utils/show-configurations-quick-pick'
import { show_incomplete_setup_warning } from '@/utils/show-missing-configuration-notification'
import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'
import { ApiPromptType } from '@shared/types/prompt-types'

export const get_api_configuration = async (params: {
  providers_manager: ProvidersManager
  show_quick_pick?: boolean
  extension_context: vscode.ExtensionContext
  prompt_view_provider?: PromptViewProvider
  api_configuration_id?: string
  prompt_type?: ApiPromptType
  last_used_state_key?: string
  default_api_configuration?: ApiConfiguration | null
  show_back_button?: boolean
  ignore_focus_out?: boolean
  caller_name?: string
  auto_select_last_used?: boolean
}): Promise<
  | { provider: Provider; api_configuration: ApiConfiguration }
  | 'back'
  | undefined
> => {
  const api_configurations =
    await params.providers_manager.get_api_configurations()

  if (api_configurations.length === 0) {
    show_incomplete_setup_warning('api')
    return undefined
  }

  let selected_api_configuration: ApiConfiguration | null = null
  const auto_select = params.auto_select_last_used ?? true

  if (params.api_configuration_id !== undefined) {
    selected_api_configuration =
      api_configurations.find(
        (c) => get_api_configuration_id(c) === params.api_configuration_id
      ) || null

    if (selected_api_configuration && params.last_used_state_key) {
      params.extension_context.workspaceState.update(
        params.last_used_state_key,
        params.api_configuration_id
      )

      if (params.prompt_view_provider && params.prompt_type) {
        params.prompt_view_provider.send_message({
          command: 'SELECTED_API_CONFIGURATION_CHANGED',
          prompt_type: params.prompt_type,
          id: params.api_configuration_id
        })
      }
    }
  } else if (!params.show_quick_pick) {
    if (params.default_api_configuration) {
      selected_api_configuration = params.default_api_configuration
    } else if (params.last_used_state_key && auto_select) {
      const last_selected_id =
        params.extension_context.workspaceState.get<string>(
          params.last_used_state_key
        )

      if (last_selected_id) {
        selected_api_configuration =
          api_configurations.find(
            (c) => get_api_configuration_id(c) === last_selected_id
          ) || null
      }
    }

    if (!selected_api_configuration && api_configurations.length === 1) {
      selected_api_configuration = api_configurations[0]
    }
  }

  if (!selected_api_configuration || params.show_quick_pick) {
    const last_selected_id = params.last_used_state_key
      ? params.extension_context.workspaceState.get<string>(
          params.last_used_state_key
        )
      : undefined

    const result = await show_configurations_quick_pick({
      items: api_configurations,
      type: 'api',
      last_selected_id,
      show_back_button: params.show_back_button,
      ignore_focus_out: params.ignore_focus_out
    })

    if (params.prompt_view_provider) {
      params.prompt_view_provider.send_message({
        command: 'FOCUS_PROMPT_FIELD'
      })
    }

    if (result === 'back') {
      return 'back'
    }

    if (!result) {
      return undefined
    }

    const { item: api_configuration, id } = result

    if (params.last_used_state_key) {
      params.extension_context.workspaceState.update(
        params.last_used_state_key,
        id
      )
    }

    if (params.prompt_view_provider && params.prompt_type) {
      params.prompt_view_provider.send_message({
        command: 'SELECTED_API_CONFIGURATION_CHANGED',
        prompt_type: params.prompt_type,
        id: id
      })
    }
    selected_api_configuration = api_configuration
  }

  const provider = await params.providers_manager.get_provider(
    selected_api_configuration.provider_name
  )

  if (!provider) {
    vscode.window.showErrorMessage(
      t('common.error.provider-not-found', {
        name: selected_api_configuration.provider_name
      })
    )
    Logger.warn({
      function_name: params.caller_name || 'get_api_configuration',
      message: `API provider not found.`
    })
    return undefined
  }

  return {
    provider,
    api_configuration: selected_api_configuration
  }
}
