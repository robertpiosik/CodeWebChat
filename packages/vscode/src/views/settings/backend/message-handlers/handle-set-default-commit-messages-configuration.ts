import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import {
  ModelProvidersManager,
  get_tool_config_id
} from '@/services/model-providers-manager'
import { SetDefaultCommitMessagesConfigurationMessage } from '@/views/settings/types/messages'

export const handle_set_default_commit_messages_configuration = async (
  provider: SettingsProvider,
  message: SetDefaultCommitMessagesConfigurationMessage
): Promise<void> => {
  const providers_manager = new ModelProvidersManager(provider.context)
  const configuration_id = message.configuration_id

  if (configuration_id === null) {
    await providers_manager.set_default_commit_messages_config(null)
    return
  }

  const configs = await providers_manager.get_commit_messages_tool_configs()
  const config_to_set_as_default = configs.find(
    (c) => get_tool_config_id(c) === configuration_id
  )

  if (config_to_set_as_default) {
    await providers_manager.set_default_commit_messages_config(
      config_to_set_as_default
    )
  }
}
