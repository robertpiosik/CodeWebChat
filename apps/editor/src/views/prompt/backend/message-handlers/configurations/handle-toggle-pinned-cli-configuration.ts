import { TogglePinnedAgentConfigurationMessage } from '@/views/prompt/types/messages'
import { toggle_pinned } from '@/views/shared/actions/agent/toggle-pinned'

export const handle_toggle_pinned_cli_configuration = async (
  message: TogglePinnedAgentConfigurationMessage
): Promise<void> => {
  await toggle_pinned({
    cli_configuration_name: message.cli_configuration_name
  })
}