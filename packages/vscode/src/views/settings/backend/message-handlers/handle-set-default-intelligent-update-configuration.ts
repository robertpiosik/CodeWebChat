import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import {
  ApiProvidersManager,
  ToolConfig
} from '@/services/api-providers-manager'
import { SetDefaultIntelligentUpdateConfigurationMessage } from '@/views/settings/types/messages'
import { handle_get_intelligent_update_configurations } from './handle-get-intelligent-update-configurations'

const generate_id = (config: ToolConfig) =>
  `${config.provider_name}:${config.model}:${config.temperature}:${
    config.reasoning_effort ?? ''
  }:${config.max_concurrency ?? ''}`

export const handle_set_default_intelligent_update_configuration = async (
  provider: SettingsProvider,
  message: SetDefaultIntelligentUpdateConfigurationMessage
): Promise<void> => {
  const providers_manager = new ApiProvidersManager(provider.context)
  const configuration_id = message.configuration_id

  const configs = await providers_manager.get_intelligent_update_tool_configs()
  const config_to_set_as_default = configs.find(
    (c) => generate_id(c) === configuration_id
  )

  if (config_to_set_as_default) {
    await providers_manager.set_default_intelligent_update_config(
      config_to_set_as_default
    )
  }

  await handle_get_intelligent_update_configurations(provider)
}
