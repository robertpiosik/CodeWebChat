import { SettingsProvider } from '../settings-provider'
import { ModelProvidersManager } from '@/services/model-providers-manager'

export const handle_reorder_api_configurations = async (
  provider: SettingsProvider,
  message: any
): Promise<void> => {
  const providers_manager = new ModelProvidersManager(provider.context)
  const current_configs = await providers_manager.get_api_configurations()
  const { get_api_configuration_id } =
    await import('@/services/model-providers-manager')

  const sorted_configs = message.api_configurations
    .map((ordered_config: any) =>
      current_configs.find(
        (c) => get_api_configuration_id(c) === ordered_config.id
      )
    )
    .filter(Boolean)

  await providers_manager.save_api_configurations(sorted_configs)

  const { handle_get_api_configurations } =
    await import('./handle-get-api-configurations')
  await handle_get_api_configurations(provider)
}
