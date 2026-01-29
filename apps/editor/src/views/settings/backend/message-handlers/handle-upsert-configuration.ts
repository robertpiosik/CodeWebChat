import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import { UpsertConfigurationMessage } from '@/views/settings/types/messages'
import { upsert_configuration } from '../../../utils/upsert-configuration'

export const handle_upsert_configuration = async (
  provider: SettingsProvider,
  message: UpsertConfigurationMessage
): Promise<void> => {
  await upsert_configuration({
    context: provider.context,
    tool_type: message.tool_type,
    configuration_id: message.configuration_id,
    insertion_index: message.insertion_index,
    create_on_top: message.create_on_top
  })
}
