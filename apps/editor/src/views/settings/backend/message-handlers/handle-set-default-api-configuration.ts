import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import {
  ModelProvidersManager,
  get_api_configuration_id
} from '@/services/model-providers-manager'
import { ToolType } from '@/views/settings/types/tools'

export const handle_set_default_api_configuration = async (
  provider: SettingsProvider,
  api_configuration_id: string | null,
  type: ToolType
): Promise<void> => {
  const providers_manager = new ModelProvidersManager(provider.context)

  const api_configurations = await providers_manager.get_api_configurations()
  const api_configuration_to_set = api_configuration_id
    ? api_configurations.find((c) => get_api_configuration_id(c) == api_configuration_id) || null
    : null

  if (type == 'code-at-cursor') {
    await providers_manager.set_default_code_completions_api_configuration(api_configuration_to_set)
  } else if (type == 'intelligent-update') {
    await providers_manager.set_default_intelligent_update_api_configuration(api_configuration_to_set)
  } else if (type == 'commit-messages') {
    await providers_manager.set_default_commit_messages_api_configuration(api_configuration_to_set)
  } else if (type == 'find-relevant-files') {
    await providers_manager.set_default_find_relevant_files_api_configuration(
      api_configuration_to_set
    )
  } else if (type == 'voice-input') {
    await providers_manager.set_default_voice_input_api_configuration(api_configuration_to_set)
  }
}
