import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { ReorderApiConfigurationsMessage } from '@/views/panel/types/messages'
import {
  ModelProvidersManager,
  ApiConfiguration
} from '@/services/model-providers-manager'
import { get_api_configuration_id } from '@/services/model-providers-manager'

export const handle_reorder_api_configurations = async (
  panel_provider: PanelProvider,
  message: ReorderApiConfigurationsMessage
): Promise<void> => {
  const providers_manager = new ModelProvidersManager(panel_provider.context)
  const reordered_ids = message.configurations.map((p) => p.id)

  const current_api_configurations = await providers_manager.get_api_configurations()
  const reordered_api_configurations = reordered_ids
    .map((id) => {
      const found = current_api_configurations.find((p) => get_api_configuration_id(p) === id)
      if (!found) {
        console.error(`Config with id ${id} not found during reorder.`)
        return null
      }
      return found
    })
    .filter((p): p is ApiConfiguration => p !== null)

  if (reordered_api_configurations.length === current_api_configurations.length) {
    await providers_manager.save_api_configurations(reordered_api_configurations)
  }
}