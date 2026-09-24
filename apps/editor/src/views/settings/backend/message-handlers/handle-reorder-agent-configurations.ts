import { ReorderAgentConfigurationsMessage } from '@/views/settings/types/messages'
import { reorder } from '@/views/shared/actions/agent/reorder'

export const handle_reorder_agent_configurations = async (
  message: ReorderAgentConfigurationsMessage
): Promise<void> => {
  await reorder({
    reordered_agent_configurations: message.agent_configurations
  })
}