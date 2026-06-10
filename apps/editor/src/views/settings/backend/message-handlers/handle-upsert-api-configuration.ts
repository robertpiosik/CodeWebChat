import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import { UpsertConfigurationMessage } from '@/views/settings/types/messages'
import { upsert_api_configuration } from '@/views/utils/upsert-api-configuration/upsert-api-configuration'

export const handle_upsert_api_configuration = async (
  provider: SettingsProvider,
  message: UpsertConfigurationMessage
): Promise<void> => {
  await upsert_api_configuration({
    context: provider.context,
    tool_type: 'code-at-cursor',
    api_configuration_id: message.configuration_id,
    insertion_index: message.insertion_index,
    create_on_top: message.create_on_top,
    duplicate_from_id: message.duplicate_from_id
  })
}
