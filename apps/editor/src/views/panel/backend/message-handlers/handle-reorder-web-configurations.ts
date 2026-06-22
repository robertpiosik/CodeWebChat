import { ReorderWebConfigurationsMessage } from '@/views/panel/types/messages'
import { reorder_web_configurations } from '@/views/utils/reorder-web-configurations'

export const handle_reorder_web_configurations = async (
  message: ReorderWebConfigurationsMessage
): Promise<void> => {
  await reorder_web_configurations({
    reordered_web_configurations: message.web_configurations
  })
}