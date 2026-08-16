import { PromptViewProvider } from '../prompt-view-provider'
import { create } from '@/views/shared/actions/api/create/create'
import { get_api_configuration_id } from '@/services/model-providers-manager'
import { CreateApiConfigurationMessage } from '../../types/messages'

export const handle_create_api_configuration = async (
  provider: PromptViewProvider,
  message: CreateApiConfigurationMessage
): Promise<void> => {
  const result = await create({
    extension_context: provider.extension_context,
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
      api_feature: message.api_feature
    })
  }
}
