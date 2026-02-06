import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import { delete_configuration } from '../../../utils/delete-configuration'
import { ToolType } from '@/views/settings/types/tools'

export const handle_delete_configuration = async (
  provider: SettingsProvider,
  configuration_id: string,
  type: ToolType
): Promise<void> => {
  await delete_configuration(provider.context, configuration_id, type)
}
