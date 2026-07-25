import { SettingsProvider } from '../settings-provider'
import { update } from '@/views/shared/actions/api/update/update'

export const handle_update_api_configuration = async (
  provider: SettingsProvider,
  message: any
): Promise<void> => {
  const result = await update({
    extension_context: provider.extension_context,
    updating_api_configuration: message.updating_api_configuration,
    updated_api_configuration: message.updated_api_configuration,
    origin: message.origin,
    is_new: message.is_new,
    insertion_index: message.insertion_index,
    api_feature: message.api_feature
  })

  if (result.success) {
    provider.postMessage({ command: 'API_CONFIGURATION_UPDATED' })
    const { handle_get_api_configurations } =
      await import('./handle-get-api-configurations')
    await handle_get_api_configurations(provider)
  }
}
