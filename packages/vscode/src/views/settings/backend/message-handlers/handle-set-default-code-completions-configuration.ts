import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import {
  ApiProvidersManager,
  ToolConfig
} from '@/services/api-providers-manager'
import { SetDefaultCodeCompletionsConfigurationMessage } from '@/views/settings/types/messages'
import { handle_get_code_completions_configurations } from './handle-get-code-completions-configurations'

const generate_id = (config: ToolConfig) =>
  `${config.provider_name}:${config.model}:${config.temperature}:${
    config.reasoning_effort ?? ''
  }`

export const handle_set_default_code_completions_configuration = async (
  provider: SettingsProvider,
  message: SetDefaultCodeCompletionsConfigurationMessage
): Promise<void> => {
  const providers_manager = new ApiProvidersManager(provider.context)
  const configuration_id = message.configuration_id

  if (configuration_id === null) {
    await providers_manager.set_default_code_completions_config(null)
    await handle_get_code_completions_configurations(provider)
    return
  }

  const configs = await providers_manager.get_code_completions_tool_configs()
  const config_to_set_as_default = configs.find(
    (c) => generate_id(c) === configuration_id
  )

  if (config_to_set_as_default) {
    await providers_manager.set_default_code_completions_config(
      config_to_set_as_default
    )
  }

  await handle_get_code_completions_configurations(provider)
}
