import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { ReorderApiConfigurationsMessage } from '@/views/panel/types/messages'
import { reorder } from '@/views/shared/actions/api/reorder'

export const handle_reorder_api_configurations = async (
  panel_provider: PanelProvider,
  message: ReorderApiConfigurationsMessage
): Promise<void> => {
  const reordered_ids = message.configurations.map((p) => p.id)
  await reorder({
    extension_context: panel_provider.extension_context,
    reordered_ids
  })
}
