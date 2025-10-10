import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import {
  ModelProvidersManager,
  ToolConfig
} from '@/services/model-providers-manager'
import { ConfigurationForClient } from '@/views/settings/types/messages'
import { SupportedTool, DEFAULT_TEMPERATURE } from '@shared/constants/api-tools'

const TOOL: SupportedTool = 'code-completions'

const generate_id = (config: ToolConfig) =>
  `${config.provider_name}:${config.model}:${config.temperature}:${
    config.reasoning_effort ?? ''
  }`

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

export const handle_get_code_completions_configurations = async (
  provider: SettingsProvider
): Promise<void> => {
  const providers_manager = new ModelProvidersManager(provider.context)
  const saved_configs =
    await providers_manager.get_code_completions_tool_configs()
  const default_config =
    await providers_manager.get_default_code_completions_config()

  const default_config_id = default_config ? generate_id(default_config) : null

  const configs_for_client: ConfigurationForClient[] = saved_configs.map(
    (config) => {
      return {
        id: generate_id(config),
        model: config.model,
        description: create_description(config),
        is_default: generate_id(config) === default_config_id
      }
    }
  )

  provider.postMessage({
    command: 'CODE_COMPLETIONS_CONFIGURATIONS',
    configurations: configs_for_client
  })
}
