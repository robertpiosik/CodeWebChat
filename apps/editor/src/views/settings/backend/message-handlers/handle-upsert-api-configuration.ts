import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import { UpsertApiConfigurationMessage } from '@/views/settings/types/messages'
import { upsert_api_configuration } from '@/views/actions/upsert-api-configuration/upsert-api-configuration'

export const handle_upsert_api_configuration = async (
  provider: SettingsProvider,
  message: UpsertApiConfigurationMessage
): Promise<void> => {
  await upsert_api_configuration({
    context: provider.context,
    tool_type: 'code-at-cursor',
    insertion_index: message.insertion_index,
    create_on_top: message.create_on_top
  })
}
