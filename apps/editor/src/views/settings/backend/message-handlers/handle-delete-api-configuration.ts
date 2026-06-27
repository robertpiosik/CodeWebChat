import { SettingsProvider } from '../settings-provider'
import { remove } from '@/views/actions/api/delete'

export const handle_delete_api_configuration = async (
  provider: SettingsProvider,
  message: any
): Promise<void> => {
  await remove({
    context: provider.context,
    api_configuration_id: message.api_configuration_id
  })
}
