import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import {
  ModelProvidersManager,
  ApiConfiguration,
  get_api_configuration_id
} from '@/services/model-providers-manager'

export const handle_reorder_api_configurations = async (
  provider: SettingsProvider,
  api_configurations: { id: string }[]
): Promise<void> => {
  const providers_manager = new ModelProvidersManager(provider.context)

  const current_api_configurations = await providers_manager.get_api_configurations()

  const reordered_ids = api_configurations.map((p) => p.id)

  const reordered_api_configurations = reordered_ids
    .map((id) => {
      const found = current_api_configurations.find((p) => get_api_configuration_id(p) == id)
      if (!found) {
        console.error(`API configuration with id ${id} not found during reorder.`)
        return null
      }
      return found
    })
    .filter((p): p is ApiConfiguration => p !== null)

  if (reordered_api_configurations.length == current_api_configurations.length) {
    await providers_manager.save_api_configurations(reordered_api_configurations)
  }
}
