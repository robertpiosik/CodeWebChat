import { TogglePinnedAgentConfigurationMessage } from '@/views/prompt/types/messages'
import { toggle_pinned } from '@/views/shared/actions/agent/toggle-pinned'

export const handle_toggle_pinned_agent_configuration = async (
  message: TogglePinnedAgentConfigurationMessage
): Promise<void> => {
  await toggle_pinned({
    agent_configuration_name: message.agent_configuration_name
  })
}