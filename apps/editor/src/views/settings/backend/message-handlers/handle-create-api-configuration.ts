import { SettingsProvider } from '../settings-provider'
import { create } from '@/views/shared/actions/api/create/create'
import { get_api_configuration_id } from '@/services/model-providers-manager'
import { CreateApiConfigurationMessage } from '../../types/messages'

export const handle_create_api_configuration = async (
  provider: SettingsProvider,
  message: CreateApiConfigurationMessage
): Promise<void> => {
  const result = await create({
    context: provider.context,
    tool_type: message.tool_type || 'intelligent-update',
    create_on_top: message.create_on_top,
    insertion_index: message.insertion_index
  })

  if (result) {
    provider.postMessage({
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
