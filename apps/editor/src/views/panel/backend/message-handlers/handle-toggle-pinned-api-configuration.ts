import { PanelProvider } from '@/views/panel/backend/panel-provider'
import {
  ModelProvidersManager,
  get_tool_config_id
} from '@/services/model-providers-manager'
import { TogglePinnedApiConfigurationMessage } from '@/views/panel/types/messages'
import { handle_get_api_configurations } from './handle-get-api-configurations'

export const handle_toggle_pinned_api_configuration = async (
  panel_provider: PanelProvider,
  message: TogglePinnedApiConfigurationMessage
): Promise<void> => {
  const { configuration_id } = message
  const providers_manager = new ModelProvidersManager(panel_provider.context)
  const configs = await providers_manager.get_tool_configs()

  const config = configs.find((c) => get_tool_config_id(c) == configuration_id)
  if (!config) return

  config.is_pinned = !config.is_pinned

  await providers_manager.save_tool_configs(configs)
  await handle_get_api_configurations(panel_provider)
}