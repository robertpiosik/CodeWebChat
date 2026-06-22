import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { ReorderApiConfigurationsMessage } from '@/views/panel/types/messages'
import { reorder_api_configurations } from '@/views/utils/reorder-api-configurations'

export const handle_reorder_api_configurations = async (
  panel_provider: PanelProvider,
  message: ReorderApiConfigurationsMessage
): Promise<void> => {
  const reordered_ids = message.configurations.map((p) => p.id)
  await reorder_api_configurations({ context: panel_provider.context, reordered_ids })
}