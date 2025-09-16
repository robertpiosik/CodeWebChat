import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import { ApiProvidersManager } from '@/services/model-providers-manager'
import { PROVIDERS } from '@shared/constants/providers'
import { ProviderForClient } from '@/views/settings/types/messages'

export const handle_get_api_providers = async (
  provider: SettingsProvider
): Promise<void> => {
  const providers_manager = new ApiProvidersManager(provider.context)
  const saved_providers = await providers_manager.get_providers()

  const providers_for_client: ProviderForClient[] = saved_providers.map((p) => {
    const apiKeyMask = p.api_key
      ? `...${p.api_key.slice(-4)}`
      : '⚠ Missing API key'

    const baseUrl =
      p.type === 'built-in'
        ? PROVIDERS[p.name].base_url
        : p.base_url || '⚠ Missing base URL'

    return {
      name: p.name,
      type: p.type,
      apiKeyMask,
      baseUrl
    }
  })

  provider.postMessage({
    command: 'API_PROVIDERS',
    providers: providers_for_client
  })
}
