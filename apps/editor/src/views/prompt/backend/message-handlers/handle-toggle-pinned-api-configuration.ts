import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'
import {
  ModelProvidersManager,
  get_api_configuration_id
} from '@/services/model-providers-manager'
import { TogglePinnedApiConfigurationMessage } from '@/views/prompt/types/messages'
import { handle_get_api_configurations } from './handle-get-api-configurations'

export const handle_toggle_pinned_api_configuration = async (
  prompt_view_provider: PromptViewProvider,
  message: TogglePinnedApiConfigurationMessage
): Promise<void> => {
  const { api_configuration_id } = message
  const providers_manager = new ModelProvidersManager(
    prompt_view_provider.extension_context
  )
  const api_configurations = await providers_manager.get_api_configurations()

  const api_configuration = api_configurations.find(
    (c) => get_api_configuration_id(c) == api_configuration_id
  )
  if (!api_configuration) return

  api_configuration.is_pinned = !api_configuration.is_pinned

  await providers_manager.save_api_configurations(api_configurations)
  await handle_get_api_configurations(prompt_view_provider)
}
