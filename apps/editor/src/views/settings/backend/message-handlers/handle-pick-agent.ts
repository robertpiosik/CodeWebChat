import { pick_agent } from '@/views/shared/actions/agent/pick-agent'
import { SettingsViewProvider } from '@/views/settings/backend/settings-view-provider'
import { PickAgentMessage } from '@/views/settings/types/messages'

export const handle_pick_agent = async (
  settings_provider: SettingsViewProvider,
  message: PickAgentMessage
): Promise<void> => {
  const selected = await pick_agent({
    current_agent_id: message.agent_id
  })
  if (selected) {
    settings_provider.postMessage({
      command: 'NEWLY_PICKED_AGENT',
      agent_id: selected
    })
  }
}