import { PanelProvider } from '../panel-provider'
import { upsert_api_configuration } from '@/views/utils/upsert-api-configuration/upsert-api-configuration'
import { get_api_configuration_id } from '@/services/model-providers-manager'

export const handle_upsert_api_configuration = async (
  provider: PanelProvider,
  message: any
): Promise<void> => {
  const new_config = await upsert_api_configuration({
    context: provider.context,
    tool_type: message.tool_type,
    api_configuration_id: message.api_configuration_id,
    duplicate_from_id: message.duplicate_from_id,
    create_on_top: message.create_on_top,
    insertion_index: message.insertion_index
  })

  if (new_config) {
    provider.send_message({
      command: 'SELECTED_API_CONFIGURATION_CHANGED',
      prompt_type: message.tool_type,
      id: get_api_configuration_id(new_config)
    })
  }
}
