import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import { ModelProvidersManager } from '@/services/model-providers-manager'

export const handle_get_model_providers = async (
  provider: SettingsProvider
): Promise<void> => {
  const providers_manager = new ModelProvidersManager(provider.context)
  const saved_model_providers = await providers_manager.get_model_providers()

  const model_providers_for_client = saved_model_providers.map((p) => {
    const api_key_mask = p.api_key ? `...${p.api_key.slice(-4)}` : ''

    return {
      name: p.name,
      api_key_mask,
      base_url: p.base_url
    }
  })

  provider.postMessage({
    command: 'MODEL_PROVIDERS',
    providers: model_providers_for_client
  })
}
