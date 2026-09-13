import { SettingsViewProvider } from '@/views/settings/backend/settings-view-provider'
import { ProvidersManager } from '@/services/providers-manager'

export const handle_get_providers = async (
  provider: SettingsViewProvider
): Promise<void> => {
  const providers_manager = new ProvidersManager(
    provider.extension_context
  )
  const saved_providers = await providers_manager.get_providers()

  const providers_for_client = saved_providers.map((p) => {
    const api_key_mask = p.api_key ? `...${p.api_key.slice(-4)}` : ''

    return {
      name: p.name,
      api_key_mask,
      base_url: p.base_url,
      extended_cache: p.extended_cache
    }
  })

  provider.postMessage({
    command: 'PROVIDERS',
    providers: providers_for_client
  })
}
