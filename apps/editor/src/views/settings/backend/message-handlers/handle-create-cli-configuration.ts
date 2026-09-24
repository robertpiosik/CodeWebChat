import { CreateAgentConfigurationMessage } from '@/views/settings/types/messages'
import { create } from '@/views/shared/actions/agent/create'
import { SettingsViewProvider } from '../settings-view-provider'
import { config_agent_configuration_to_ui_format } from '@/utils/cli-configuration-format-converters'

export const handle_create_agent_configuration = async (
  provider: SettingsViewProvider,
  message: CreateAgentConfigurationMessage
): Promise<void> => {
  const result = await create({
    reference_index: message.insertion_index,
    exact_insertion: message.exact_insertion
  })

  if (result) {
    provider.postMessage({
      command: 'START_AGENT_CONFIGURATION_CREATION',
      agent_configuration: config_agent_configuration_to_ui_format(result.config),
      insertion_index: result.insertion_index
    })
  }
}