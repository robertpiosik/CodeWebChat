import { PanelProvider } from '@/views/panel/backend/panel-provider'
import {
  ModelProvidersManager,
  get_api_configuration_id
} from '@/services/model-providers-manager'
import { TogglePinnedApiConfigurationMessage } from '@/views/panel/types/messages'
import { handle_get_api_configurations } from './handle-get-api-configurations'

export const handle_toggle_pinned_api_configuration = async (
  panel_provider: PanelProvider,
  message: TogglePinnedApiConfigurationMessage
): Promise<void> => {
  const { api_configuration_id } = message
  const providers_manager = new ModelProvidersManager(panel_provider.context)
  const api_configurations = await providers_manager.get_api_configurations()

  const api_configuration = api_configurations.find((c) => get_api_configuration_id(c) == api_configuration_id)
  if (!api_configuration) return

  api_configuration.is_pinned = !api_configuration.is_pinned

  await providers_manager.save_api_configurations(api_configurations)
  await handle_get_api_configurations(panel_provider)
}