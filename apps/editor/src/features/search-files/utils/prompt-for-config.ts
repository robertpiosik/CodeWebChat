import * as vscode from 'vscode'
import {
  ProvidersManager,
  get_api_configuration_id,
  ApiConfiguration,
  Provider
} from '@/services/providers-manager'
import { LAST_USED_INTELLIGENT_FILE_SEARCH_CONFIG_ID_STATE_KEY } from '@/constants/state-keys'
import { t } from '@/i18n'
import { show_configurations_quick_pick } from '@/utils/show-configurations-quick-pick'
import { display_token_count } from '@shared/utils/display-token-count'

export const prompt_for_api_configuration = async (params: {
  providers_manager: ProvidersManager
  extension_context: vscode.ExtensionContext
  api_configurations: ApiConfiguration[]
  tokens_to_process: number
  show_quick_pick?: boolean
}): Promise<
  | {
      api_configuration: ApiConfiguration
      provider: Provider
      skipped: boolean
    }
  | 'back'
  | 'cancel'
> => {
  let selected_api_configuration: ApiConfiguration | undefined = undefined
  let skipped = false

  if (!params.show_quick_pick) {
    if (params.api_configurations.length == 1) {
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
      'command.search-files-command.config.placeholder-with-tokens',
      {
        tokens: display_token_count(params.tokens_to_process)
      }
    )

    const result = await show_configurations_quick_pick({
      items: params.api_configurations,
      type: 'api',
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

  const provider = await params.providers_manager.get_provider(
    selected_api_configuration.provider_name
  )
  if (!provider) {
    vscode.window.showErrorMessage(
      t('common.error.provider-not-found', {
        name: selected_api_configuration.provider_name
      })
    )
    return 'cancel'
  }

  return {
    api_configuration: selected_api_configuration,
    provider,
    skipped
  }
}
