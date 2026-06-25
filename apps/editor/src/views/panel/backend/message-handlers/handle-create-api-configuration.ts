import { PanelProvider } from '../panel-provider'
import { create_api_configuration } from '@/views/actions/create-api-configuration/create-api-configuration'
import { get_api_configuration_id } from '@/services/model-providers-manager'
import { CreateApiConfigurationMessage } from '../../types/messages'

export const handle_create_api_configuration = async (
  provider: PanelProvider,
  message: CreateApiConfigurationMessage
): Promise<void> => {
  const result = await create_api_configuration({
    context: provider.context,
    tool_type: message.tool_type,
    create_on_top: message.create_on_top,
    insertion_index: message.insertion_index
  })

  if (result) {
    provider.send_message({
      command: 'START_API_CONFIGURATION_CREATION',
      api_configuration: {
        ...result.config,
        id: get_api_configuration_id(result.config)
      },
      insertion_index: result.insertion_index,
      tool_type: message.tool_type
    })
  }
}
