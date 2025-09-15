import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import { ApiProvidersManager, Provider } from '@/services/api-providers-manager'
import { ReorderApiProvidersMessage } from '@/views/settings/types/messages'

export const handle_reorder_api_providers = async (
  provider: SettingsProvider,
  message: ReorderApiProvidersMessage
): Promise<void> => {
  const providers_manager = new ApiProvidersManager(provider.context)
  const current_providers = await providers_manager.get_providers()

  const reordered_names = message.providers.map((p) => p.name)

  // Make sure all providers exist
  const reordered_providers = reordered_names
    .map((name) => {
      const found = current_providers.find((p) => p.name == name)
      if (!found) {
        console.error(`Provider with name ${name} not found during reorder.`)
        return null
      }
      return found
    })
    .filter((p): p is Provider => p !== null)

  if (reordered_providers.length == current_providers.length) {
    await providers_manager.save_providers(reordered_providers)
  }
}
