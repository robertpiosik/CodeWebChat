import { DeleteAgentConfigurationMessage } from '@/views/prompt/types/messages'
import { remove } from '@/views/shared/actions/agent/delete'

export const handle_delete_agent_configuration = async (
  message: DeleteAgentConfigurationMessage
): Promise<void> => {
  await remove({ name: message.name })
}