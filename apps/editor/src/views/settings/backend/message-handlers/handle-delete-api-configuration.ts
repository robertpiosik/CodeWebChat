import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import { delete_api_configuration } from '../../../utils/delete-api-configuration'

export const handle_delete_api_configuration = async (
  provider: SettingsProvider,
  api_configuration_id: string
): Promise<void> => {
  await delete_api_configuration({
    context: provider.context,
    api_configuration_id
  })
}
