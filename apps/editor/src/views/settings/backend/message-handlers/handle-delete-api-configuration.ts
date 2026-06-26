import { SettingsProvider } from '../settings-provider'
import { delete_api_configuration } from '@/views/actions/delete-api-configuration'

export const handle_delete_api_configuration = async (
  provider: SettingsProvider,
  message: any
): Promise<void> => {
  await delete_api_configuration({
    context: provider.context,
    api_configuration_id: message.api_configuration_id
  })
}
