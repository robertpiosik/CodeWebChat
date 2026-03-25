import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import { delete_configuration } from '../../../utils/delete-configuration'

export const handle_delete_configuration = async (
  provider: SettingsProvider,
  configuration_id: string
): Promise<void> => {
  await delete_configuration({
    context: provider.context,
    configuration_id
  })
}
