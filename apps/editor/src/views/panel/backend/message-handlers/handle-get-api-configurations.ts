import { PanelProvider } from '@/views/panel/backend/panel-provider'
import {
  ModelProvidersManager,
  get_api_configuration_id
} from '@/services/model-providers-manager'
import { ApiConfiguration } from '@/views/panel/types/messages'

export const handle_get_api_configurations = async (
  panel_provider: PanelProvider
): Promise<void> => {
  const providers_manager = new ModelProvidersManager(panel_provider.context)

  const api_configurations_list = await providers_manager.get_api_configurations()

  const configurations: ApiConfiguration[] = api_configurations_list.map((api_configuration) => ({
    ...api_configuration,
    id: get_api_configuration_id(api_configuration)
  }))

  panel_provider.send_message({
    command: 'API_CONFIGURATIONS',
    configurations
  })
}