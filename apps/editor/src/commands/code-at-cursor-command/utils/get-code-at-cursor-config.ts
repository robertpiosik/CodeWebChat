import * as vscode from 'vscode'
import {
  ModelProvidersManager,
  get_api_configuration_id,
  ApiConfiguration
} from '../../../services/model-providers-manager'
import { Logger } from '@shared/utils/logger'
import { LAST_USED_CODE_AT_CURSOR_CONFIG_ID_STATE_KEY } from '@/constants/state-keys'
import { t } from '@/i18n'
import {
  show_configuration_quick_pick,
  map_api_configuration_to_item
} from '@/utils/show-configuration-quick-pick'
import { show_no_configurations_warning } from '@/utils/show-no-configurations-warning'

export const get_code_at_cursor_api_configuration = async (params: {
  model_providers_manager: ModelProvidersManager
  show_quick_pick?: boolean
  extension_context: vscode.ExtensionContext
  api_configuration_id?: string
}): Promise<{ model_provider: any; api_configuration: any } | undefined> => {
  const code_at_cursor_api_configurations =
    await params.model_providers_manager.get_api_configurations()

  if (code_at_cursor_api_configurations.length == 0) {
    show_no_configurations_warning('api')
    return
  }

  let selected_api_configuration: ApiConfiguration | null = null

  if (params.api_configuration_id !== undefined) {
    selected_api_configuration =
      code_at_cursor_api_configurations.find(
        (c) => get_api_configuration_id(c) === params.api_configuration_id
      ) || null
  } else if (!params.show_quick_pick) {
    const default_api_configuration =
      await params.model_providers_manager.get_default_code_at_cursor_api_configuration()
    if (default_api_configuration) {
      selected_api_configuration = default_api_configuration
    } else if (code_at_cursor_api_configurations.length == 1) {
      selected_api_configuration = code_at_cursor_api_configurations[0]
    }
  }

  if (!selected_api_configuration || params.show_quick_pick) {
    const last_selected_id =
      params.extension_context.workspaceState.get<string>(
        LAST_USED_CODE_AT_CURSOR_CONFIG_ID_STATE_KEY
      )

    const result = await show_configuration_quick_pick({
      items: code_at_cursor_api_configurations,
      map_item: map_api_configuration_to_item,
      last_selected_id,
      placeholder: t('command.code-at-cursor.config.placeholder')
    })

    if (!result || result === 'back') {
      return undefined
    }

    const { item: api_configuration, id } = result

    params.extension_context.workspaceState.update(
      LAST_USED_CODE_AT_CURSOR_CONFIG_ID_STATE_KEY,
      id
    )

    selected_api_configuration = api_configuration
  }

  const model_provider =
    await params.model_providers_manager.get_model_provider(
      selected_api_configuration.model_provider_name
    )

  if (!model_provider) {
    vscode.window.showErrorMessage(t('common.error.api-provider-not-found'))
    Logger.warn({
      function_name: 'get_code_at_cursor_api_configuration',
      message: 'API provider not found for Code at Cursor tool.'
    })
    return
  }

  return {
    model_provider,
    api_configuration: selected_api_configuration
  }
}
