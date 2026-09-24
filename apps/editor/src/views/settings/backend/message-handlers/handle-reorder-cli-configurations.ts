import { ReorderAgentConfigurationsMessage } from '@/views/settings/types/messages'
import { reorder } from '@/views/shared/actions/agent/reorder'

export const handle_reorder_cli_configurations = async (
  message: ReorderAgentConfigurationsMessage
): Promise<void> => {
  await reorder({
    reordered_cli_configurations: message.cli_configurations
  })
}