import { PanelProvider } from '@/views/panel/backend/panel-provider'
import {
  ModelProvidersManager,
  get_tool_config_id
} from '@/services/model-providers-manager'
import { ApiConfiguration } from '@/views/panel/types/messages'

export const handle_get_api_configurations = async (
  panel_provider: PanelProvider
): Promise<void> => {
  const providers_manager = new ModelProvidersManager(panel_provider.context)

  const configs = await providers_manager.get_tool_configs()

  const configurations: ApiConfiguration[] = configs.map((config) => ({
    ...config,
    id: get_tool_config_id(config)
  }))

  panel_provider.send_message({
    command: 'API_CONFIGURATIONS',
    configurations
  })
}