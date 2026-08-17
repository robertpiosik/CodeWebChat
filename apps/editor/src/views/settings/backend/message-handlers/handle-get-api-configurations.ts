import { SettingsViewProvider } from '@/views/settings/backend/settings-view-provider'
import {
  ModelProvidersManager,
  get_api_configuration_id
} from '@/services/model-providers-manager'
import { ApiConfiguration } from '@/views/settings/types/messages'

export const handle_get_api_configurations = async (
  provider: SettingsViewProvider
): Promise<void> => {
  const providers_manager = new ModelProvidersManager(
    provider.extension_context
  )

  const saved_api_configurations =
    await providers_manager.get_api_configurations()

  const api_configurations: ApiConfiguration[] = saved_api_configurations.map(
    (api_configuration) => ({
      ...api_configuration,
      id: get_api_configuration_id(api_configuration)
    })
  )

  const def_cac =
    await providers_manager.get_default_code_at_cursor_api_configuration()
  const def_iu =
    await providers_manager.get_default_intelligent_update_api_configuration()
  const def_cm =
    await providers_manager.get_default_commit_messages_api_configuration()
  const def_ifs =
    await providers_manager.get_default_intelligent_file_search_api_configuration()
  const def_vi =
    await providers_manager.get_default_voice_input_api_configuration()

  provider.postMessage({
    command: 'API_CONFIGURATIONS',
    api_configurations,
    defaults: {
      'code-at-cursor': def_cac ? get_api_configuration_id(def_cac) : null,
      'intelligent-update': def_iu ? get_api_configuration_id(def_iu) : null,
      'commit-messages': def_cm ? get_api_configuration_id(def_cm) : null,
      'intelligent-file-search': def_ifs
        ? get_api_configuration_id(def_ifs)
        : null,
      'voice-input': def_vi ? get_api_configuration_id(def_vi) : null,
      'edit-files': null
    }
  })
}
