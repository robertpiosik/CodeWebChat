import { ReorderWebConfigurationsMessage } from '@/views/panel/types/messages'
import { reorder } from '@/views/actions/web/reorder'

export const handle_reorder_web_configurations = async (
  message: ReorderWebConfigurationsMessage
): Promise<void> => {
  await reorder({
    reordered_web_configurations: message.web_configurations
  })
}
