import { pick_agent } from '@/views/shared/actions/agent/pick-agent'
import { PromptViewProvider } from '../prompt-view-provider'
import { PickAgentMessage } from '../../types/messages'

export const handle_pick_agent = async (
  prompt_view_provider: PromptViewProvider,
  message: PickAgentMessage
): Promise<void> => {
  const selected = await pick_agent({
    current_agent_id: message.agent_id
  })
  if (selected) {
    prompt_view_provider.send_message({
      command: 'NEWLY_PICKED_AGENT',
      agent_id: selected
    })
  }
}