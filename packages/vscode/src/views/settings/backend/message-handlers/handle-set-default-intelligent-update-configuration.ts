import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import {
  ModelProvidersManager,
  ToolConfig
} from '@/services/model-providers-manager'
import { SetDefaultIntelligentUpdateConfigurationMessage } from '@/views/settings/types/messages'

const generate_id = (config: ToolConfig) =>
  `${config.provider_name}:${config.model}:${config.temperature}:${
    config.reasoning_effort ?? ''
  }:${config.max_concurrency ?? ''}`

export const handle_set_default_intelligent_update_configuration = async (
  provider: SettingsProvider,
  message: SetDefaultIntelligentUpdateConfigurationMessage
): Promise<void> => {
  const providers_manager = new ModelProvidersManager(provider.context)
  const configuration_id = message.configuration_id

  if (configuration_id === null) {
    await providers_manager.set_default_intelligent_update_config(null)
    return
  }

  const configs = await providers_manager.get_intelligent_update_tool_configs()
  const config_to_set_as_default = configs.find(
    (c) => generate_id(c) === configuration_id
  )

  if (config_to_set_as_default) {
    await providers_manager.set_default_intelligent_update_config(
      config_to_set_as_default
    )
  }
}
