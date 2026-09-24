import { config_agent_configuration_to_ui_format } from '@/utils/agent-configuration-format-converters'
import { PromptViewProvider } from '../prompt-view-provider'
import { create } from '@/views/shared/actions/agent/create'

export const handle_create_agent_configuration = async (
  provider: PromptViewProvider,
  message: any
): Promise<void> => {
  const result = await create({
    reference_index: message.reference_index,
    exact_insertion: message.exact_insertion
  })

  if (result) {
    provider.send_message({
      command: 'START_AGENT_CONFIGURATION_CREATION',
      agent_configuration: config_agent_configuration_to_ui_format(result.config),
      insertion_index: result.insertion_index
    })
  }
}