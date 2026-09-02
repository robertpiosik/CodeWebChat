import * as vscode from 'vscode'
import {
  ModelProvidersManager,
  get_api_configuration_id,
  ApiConfiguration,
  ModelProvider
} from '@/services/model-providers-manager'
import { LAST_USED_INTELLIGENT_FILE_SEARCH_CONFIG_ID_STATE_KEY } from '@/constants/state-keys'
import { t } from '@/i18n'
import {
  show_configuration_quick_pick,
  map_api_configuration_to_item
} from '@/utils/show-configuration-quick-pick'
import { display_token_count } from '@shared/utils/display-token-count'

export const prompt_for_api_configuration = async (params: {
  model_providers_manager: ModelProvidersManager
  extension_context: vscode.ExtensionContext
  api_configurations: ApiConfiguration[]
  tokens_to_process: number
  show_quick_pick?: boolean
}): Promise<
  | {
      api_configuration: ApiConfiguration
      model_provider: ModelProvider
      skipped: boolean
    }
  | 'back'
  | 'cancel'
> => {
  let selected_api_configuration: ApiConfiguration | undefined = undefined
  let skipped = false

  if (!params.show_quick_pick) {
    const default_api_configuration =
      await params.model_providers_manager.get_default_intelligent_file_search_api_configuration()

    if (default_api_configuration) {
      selected_api_configuration = default_api_configuration
      skipped = true
    } else if (params.api_configurations.length == 1) {
      selected_api_configuration = params.api_configurations[0]
      skipped = true
    }
  }

  if (!selected_api_configuration) {
    const last_selected_id =
      params.extension_context.workspaceState.get<string>(
        LAST_USED_INTELLIGENT_FILE_SEARCH_CONFIG_ID_STATE_KEY
      )

    const placeholder = t(
      'command.search-files.config.placeholder-with-tokens',
      {
        tokens: display_token_count(params.tokens_to_process)
      }
    )

    const result = await show_configuration_quick_pick({
      items: params.api_configurations,
      map_item: map_api_configuration_to_item,
      last_selected_id,
      placeholder,
      show_back_button: true
    })

    if (result == 'back') return 'back'
    if (!result) return 'cancel'
    selected_api_configuration = result.item
  }

  if (selected_api_configuration) {
    const selected_id = get_api_configuration_id(selected_api_configuration)
    await params.extension_context.workspaceState.update(
      LAST_USED_INTELLIGENT_FILE_SEARCH_CONFIG_ID_STATE_KEY,
      selected_id
    )
  }

  const model_provider =
    await params.model_providers_manager.get_model_provider(
      selected_api_configuration.model_provider_name
    )
  if (!model_provider) {
    vscode.window.showErrorMessage(
      t('feature.search-files.error.provider-not-found')
    )
    return 'cancel'
  }

  return {
    api_configuration: selected_api_configuration,
    model_provider,
    skipped
  }
}
