import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'
import {
  ModelProvidersManager,
  get_api_configuration_id
} from '@/services/model-providers-manager'
import { ApiConfiguration } from '@/views/prompt/types/messages'

export const handle_get_api_configurations = async (
  prompt_view_provider: PromptViewProvider
): Promise<void> => {
  const providers_manager = new ModelProvidersManager(
    prompt_view_provider.extension_context
  )

  const api_configurations_list =
    await providers_manager.get_api_configurations()

  const configurations: ApiConfiguration[] = api_configurations_list.map(
    (api_configuration) => ({
      ...api_configuration,
      id: get_api_configuration_id(api_configuration)
    })
  )

  prompt_view_provider.send_message({
    command: 'API_CONFIGURATIONS',
    configurations
  })
}
