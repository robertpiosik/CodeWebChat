import { SettingsProvider } from '../settings-provider'
import { update_api_configuration } from '@/views/actions/update-api-configuration/update-api-configuration'

export const handle_update_api_configuration = async (
  provider: SettingsProvider,
  message: any
): Promise<void> => {
  const result = await update_api_configuration({
    context: provider.context,
    updating_api_configuration: message.updating_api_configuration,
    updated_api_configuration: message.updated_api_configuration,
    origin: message.origin,
    is_new: message.is_new,
    insertion_index: message.insertion_index,
    tool_type: message.tool_type
  })

  if (result.success) {
    provider.postMessage({ command: 'API_CONFIGURATION_UPDATED' })
    const { handle_get_api_configurations } =
      await import('./handle-get-api-configurations')
    await handle_get_api_configurations(provider)
  }
}
