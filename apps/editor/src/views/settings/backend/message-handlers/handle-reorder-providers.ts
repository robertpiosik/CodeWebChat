import { SettingsViewProvider } from '@/views/settings/backend/settings-view-provider'
import {
  ProvidersManager,
  Provider
} from '@/services/providers-manager'
import { ReorderProvidersMessage } from '@/views/settings/types/messages'

export const handle_reorder_providers = async (
  provider: SettingsViewProvider,
  message: ReorderProvidersMessage
): Promise<void> => {
  const providers_manager = new ProvidersManager(
    provider.extension_context
  )
  const current_providers = await providers_manager.get_providers()

  const reordered_names = message.providers.map((p) => p.name)

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
