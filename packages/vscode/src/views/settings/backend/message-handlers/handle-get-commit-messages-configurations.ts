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

export const handle_get_commit_messages_configurations = async (
  provider: SettingsProvider
): Promise<void> => {
  const providers_manager = new ModelProvidersManager(provider.context)
  const saved_configs =
    await providers_manager.get_commit_messages_tool_configs()
  const default_config =
    await providers_manager.get_default_commit_messages_config()

  const default_config_id = default_config
    ? get_tool_config_id(default_config)
    : null

  const configs_for_client: ConfigurationForClient[] = saved_configs.map(
    (config) => {
      return {
        id: get_tool_config_id(config),
        model: config.model,
        description: create_description(config),
        is_default: get_tool_config_id(config) === default_config_id
      }
    }
  )

  provider.postMessage({
    command: 'COMMIT_MESSAGES_CONFIGURATIONS',
    configurations: configs_for_client
  })
}
