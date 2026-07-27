import { PanelViewProvider } from '@/views/panel/backend/panel-view-provider'
import { ReorderApiConfigurationsMessage } from '@/views/panel/types/messages'
import { reorder } from '@/views/shared/actions/api/reorder'

export const handle_reorder_api_configurations = async (
  panel_view_provider: PanelViewProvider,
  message: ReorderApiConfigurationsMessage
): Promise<void> => {
  const reordered_ids = message.configurations.map((p) => p.id)
  await reorder({
    extension_context: panel_view_provider.extension_context,
    reordered_ids
  })
}
