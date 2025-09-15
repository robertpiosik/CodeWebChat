import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import {
  ApiProvidersManager,
  ToolConfig
} from '@/services/api-providers-manager'
import { ConfigurationForClient } from '@/views/settings/types/messages'
import { SupportedTool, DEFAULT_TEMPERATURE } from '@shared/constants/api-tools'

const TOOL: SupportedTool = 'commit-messages'

const create_description = (config: ToolConfig): string => {
  const description_parts = [config.provider_name]
  if (config.temperature != DEFAULT_TEMPERATURE[TOOL]) {
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
  const providers_manager = new ApiProvidersManager(provider.context)
  const saved_configs =
    await providers_manager.get_commit_messages_tool_configs()
  const default_config =
    await providers_manager.get_default_commit_messages_config()

  const configs_for_client: ConfigurationForClient[] = saved_configs.map(
    (config) => {
      const is_default = default_config
        ? default_config.provider_type == config.provider_type &&
          default_config.provider_name == config.provider_name &&
          default_config.model == config.model &&
          default_config.temperature == config.temperature &&
          default_config.reasoning_effort == config.reasoning_effort
        : false

      return {
        id: `${config.provider_name}:${config.model}:${config.temperature}:${
          config.reasoning_effort ?? ''
        }`,
        model: config.model,
        description: create_description(config),
        is_default
      }
    }
  )

  provider.postMessage({
    command: 'COMMIT_MESSAGES_CONFIGURATIONS',
    configurations: configs_for_client
  })
}
