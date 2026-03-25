import { PanelProvider } from '@/views/panel/backend/panel-provider'
import {
  ModelProvidersManager,
  get_tool_config_id
} from '@/services/model-providers-manager'
import { TogglePinnedApiToolConfigurationMessage } from '@/views/panel/types/messages'
import { handle_get_api_tool_configurations } from './handle-get-api-tool-configurations'

export const handle_toggle_pinned_api_tool_configuration = async (
  panel_provider: PanelProvider,
  message: TogglePinnedApiToolConfigurationMessage
): Promise<void> => {
  const { configuration_id } = message
  const providers_manager = new ModelProvidersManager(panel_provider.context)
  const configs = await providers_manager.get_tool_configs()

  const config = configs.find((c) => get_tool_config_id(c) == configuration_id)
  if (!config) return

  config.is_pinned = !config.is_pinned

  await providers_manager.save_tool_configs(configs)
  await handle_get_api_tool_configurations(panel_provider)
}
