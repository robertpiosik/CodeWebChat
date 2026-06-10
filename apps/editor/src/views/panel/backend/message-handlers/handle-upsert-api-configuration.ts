import { PanelProvider } from '../panel-provider'
import { upsert_api_configuration } from '@/views/utils/upsert-api-configuration/upsert-api-configuration'

export const handle_upsert_api_configuration = async (
  provider: PanelProvider,
  message: any
): Promise<void> => {
  await upsert_api_configuration({
    context: provider.context,
    tool_type: message.tool_type,
    api_configuration_id: message.api_configuration_id,
    duplicate_from_id: message.duplicate_from_id,
    create_on_top: message.create_on_top,
    insertion_index: message.insertion_index
  })
}
