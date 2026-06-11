import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import {
  ModelProvidersManager,
  ApiConfiguration,
  get_api_configuration_id
} from '@/services/model-providers-manager'
import { ApiConfigurationForClient } from '@/views/settings/types/messages'

const create_description = (api_configuration: ApiConfiguration): string => {
  const description_parts = [api_configuration.model_provider_name]
  if (api_configuration.temperature != null) {
    description_parts.push(`${api_configuration.temperature}`)
  }
  if (api_configuration.reasoning_effort) {
    description_parts.push(`${api_configuration.reasoning_effort}`)
  }
  return description_parts.join(' · ')
}

export const handle_get_api_configurations = async (
  provider: SettingsProvider
): Promise<void> => {
  const providers_manager = new ModelProvidersManager(provider.context)

  const saved_api_configurations = await providers_manager.get_api_configurations()

  const def_cac = await providers_manager.get_default_code_completions_api_configuration()
  const def_iu = await providers_manager.get_default_intelligent_update_api_configuration()
  const def_cm = await providers_manager.get_default_commit_messages_api_configuration()
  const def_frf =
    await providers_manager.get_default_find_relevant_files_api_configuration()
  const def_vi = await providers_manager.get_default_voice_input_api_configuration()

  const api_configurations_for_client: ApiConfigurationForClient[] = saved_api_configurations.map(
    (api_configuration) => {
      return {
        id: get_api_configuration_id(api_configuration),
        model: api_configuration.model,
        description: create_description(api_configuration)
      }
    }
  )

  provider.postMessage({
    command: 'API_CONFIGURATIONS',
    api_configurations: api_configurations_for_client,
    defaults: {
      'code-at-cursor': def_cac ? get_api_configuration_id(def_cac) : null,
      'intelligent-update': def_iu ? get_api_configuration_id(def_iu) : null,
      'commit-messages': def_cm ? get_api_configuration_id(def_cm) : null,
      'find-relevant-files': def_frf ? get_api_configuration_id(def_frf) : null,
      'voice-input': def_vi ? get_api_configuration_id(def_vi) : null,
      'edit-context': null
    }
  })
}
