import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import {
  ModelProvidersManager,
  ToolConfig,
  get_tool_config_id
} from '@/services/model-providers-manager'
import { ConfigurationForClient } from '@/views/settings/types/messages'

const create_description = (config: ToolConfig): string => {
  const description_parts = [config.provider_name]
  if (config.temperature != null) {
    description_parts.push(`${config.temperature}`)
  }
  if (config.reasoning_effort) {
    description_parts.push(`${config.reasoning_effort}`)
  }
  return description_parts.join(' · ')
}

export const handle_get_configurations = async (
  provider: SettingsProvider
): Promise<void> => {
  const providers_manager = new ModelProvidersManager(provider.context)

  const saved_configs =
    await providers_manager.get_code_completions_tool_configs()

  const def_cac = await providers_manager.get_default_code_completions_config()
  const def_iu = await providers_manager.get_default_intelligent_update_config()
  const def_cm = await providers_manager.get_default_commit_messages_config()
  const def_frf =
    await providers_manager.get_default_find_relevant_files_config()
  const def_vi = await providers_manager.get_default_voice_input_config()

  const configs_for_client: ConfigurationForClient[] = saved_configs.map(
    (config) => {
      return {
        id: get_tool_config_id(config),
        model: config.model,
        description: create_description(config)
      }
    }
  )

  provider.postMessage({
    command: 'CONFIGURATIONS',
    configurations: configs_for_client,
    defaults: {
      'code-at-cursor': def_cac ? get_tool_config_id(def_cac) : null,
      'intelligent-update': def_iu ? get_tool_config_id(def_iu) : null,
      'commit-messages': def_cm ? get_tool_config_id(def_cm) : null,
      'find-relevant-files': def_frf ? get_tool_config_id(def_frf) : null,
      'voice-input': def_vi ? get_tool_config_id(def_vi) : null,
      'edit-context': null
    }
  })
}
