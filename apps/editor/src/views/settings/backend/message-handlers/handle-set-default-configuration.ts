import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import {
  ModelProvidersManager,
  get_tool_config_id,
  ToolConfig
} from '@/services/model-providers-manager'
import { ToolType } from '@/views/settings/types/tools'

export const handle_set_default_configuration = async (
  provider: SettingsProvider,
  configuration_id: string | null,
  type: ToolType
): Promise<void> => {
  const providers_manager = new ModelProvidersManager(provider.context)

  const configs = await providers_manager.get_code_completions_tool_configs()
  const config_to_set = configuration_id
    ? configs.find((c) => get_tool_config_id(c) == configuration_id) || null
    : null

  if (type == 'code-at-cursor') {
    await providers_manager.set_default_code_completions_config(config_to_set)
  } else if (type == 'intelligent-update') {
    await providers_manager.set_default_intelligent_update_config(config_to_set)
  } else if (type == 'commit-messages') {
    await providers_manager.set_default_commit_messages_config(config_to_set)
  } else if (type == 'find-relevant-files') {
    await providers_manager.set_default_find_relevant_files_config(
      config_to_set
    )
  } else if (type == 'voice-input') {
    await providers_manager.set_default_voice_input_config(config_to_set)
  }
}
