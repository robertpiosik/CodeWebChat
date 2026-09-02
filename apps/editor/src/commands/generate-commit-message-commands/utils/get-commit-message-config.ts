import * as vscode from 'vscode'
import { ModelProvidersManager } from '@/services/model-providers-manager'
import { Logger } from '@shared/utils/logger'
import { LAST_USED_COMMIT_MESSAGES_CONFIG_ID_STATE_KEY } from '@/constants/state-keys'
import { t } from '@/i18n'
import {
  show_configuration_quick_pick,
  map_api_configuration_to_item
} from '@/utils/show-configuration-quick-pick'
import { show_no_configurations_warning } from '@/utils/show-no-configurations-warning'

export interface CommitMessageApiConfiguration {
  model_provider_name: string
  model: string
  reasoning_effort?: string
}

export const get_commit_message_api_configuration = async (params: {
  extension_context: vscode.ExtensionContext
  show_back_button?: boolean
  show_quick_pick?: boolean
}): Promise<
  | {
      api_configuration: CommitMessageApiConfiguration
      model_provider: any
      base_url: string
    }
  | 'back'
  | null
> => {
  const model_providers_manager = new ModelProvidersManager(
    params.extension_context
  )
  const show_quick_pick = params.show_quick_pick ?? false
  const show_back_button = params.show_back_button ?? true

  let commit_message_api_configuration:
    | CommitMessageApiConfiguration
    | null
    | undefined
    | 'back' = show_quick_pick
    ? undefined
    : await model_providers_manager.get_default_commit_messages_api_configuration()

  if (!commit_message_api_configuration) {
    const api_configurations =
      await model_providers_manager.get_api_configurations()

    if (api_configurations.length == 0) {
      show_no_configurations_warning('api')
      return null
    }

    if (api_configurations.length == 1 && !show_quick_pick) {
      commit_message_api_configuration = api_configurations[0]
    } else if (api_configurations.length >= 1) {
      const last_selected_id =
        params.extension_context.workspaceState.get<string>(
          LAST_USED_COMMIT_MESSAGES_CONFIG_ID_STATE_KEY
        )

      const placeholder = t('common.config.placeholder')

      const result = await show_configuration_quick_pick({
        items: api_configurations,
        map_item: map_api_configuration_to_item,
        last_selected_id,
        placeholder,
        show_back_button
      })

      if (result == 'back' || !result) {
        commit_message_api_configuration = 'back'
      } else {
        params.extension_context.workspaceState.update(
          LAST_USED_COMMIT_MESSAGES_CONFIG_ID_STATE_KEY,
          result.id
        )
        commit_message_api_configuration = result.item
      }
    }
  }

  if (commit_message_api_configuration == 'back') {
    return 'back'
  }

  if (!commit_message_api_configuration) {
    return null
  }

  const model_provider = await model_providers_manager.get_model_provider(
    commit_message_api_configuration.model_provider_name
  )

  if (!model_provider) {
    vscode.window.showErrorMessage(t('common.error.api-provider-not-found'))
    Logger.warn({
      function_name: 'get_commit_message_api_configuration',
      message: 'API provider not found for Commit Messages tool.'
    })
    return null
  }

  return {
    api_configuration: commit_message_api_configuration,
    model_provider,
    base_url: model_provider.base_url
  }
}
