import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import {
  ModelProvidersManager,
  ModelProvider
} from '@/services/model-providers-manager'
import { ReorderModelProvidersMessage } from '@/views/settings/types/messages'

export const handle_reorder_model_providers = async (
  provider: SettingsProvider,
  message: ReorderModelProvidersMessage
): Promise<void> => {
  const providers_manager = new ModelProvidersManager(provider.context)
  const current_model_providers = await providers_manager.get_model_providers()

  const reordered_names = message.providers.map((p) => p.name)

  const reordered_model_providers = reordered_names
    .map((name) => {
      const found = current_model_providers.find((p) => p.name == name)
      if (!found) {
        console.error(`Provider with name ${name} not found during reorder.`)
        return null
      }
      return found
    })
    .filter((p): p is ModelProvider => p !== null)

  if (reordered_model_providers.length == current_model_providers.length) {
    await providers_manager.save_model_providers(reordered_model_providers)
  }
}
