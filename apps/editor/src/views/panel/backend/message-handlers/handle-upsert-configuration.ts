import { PanelProvider } from '../panel-provider'
import { upsert_configuration } from '@/views/utils/upsert-configuration/upsert-configuration'

export const handle_upsert_configuration = async (
  provider: PanelProvider,
  message: any
): Promise<void> => {
  await upsert_configuration({
    context: provider.context,
    tool_type: message.tool_type,
    configuration_id: message.configuration_id,
    duplicate_from_id: message.duplicate_from_id,
    create_on_top: message.create_on_top,
    insertion_index: message.insertion_index
  })
}
