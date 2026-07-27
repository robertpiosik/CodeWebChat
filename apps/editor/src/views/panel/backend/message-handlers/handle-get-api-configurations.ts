import { PanelViewProvider } from '@/views/panel/backend/panel-view-provider'
import {
  ModelProvidersManager,
  get_api_configuration_id
} from '@/services/model-providers-manager'
import { ApiConfiguration } from '@/views/panel/types/messages'

export const handle_get_api_configurations = async (
  panel_view_provider: PanelViewProvider
): Promise<void> => {
  const providers_manager = new ModelProvidersManager(
    panel_view_provider.extension_context
  )

  const api_configurations_list =
    await providers_manager.get_api_configurations()

  const configurations: ApiConfiguration[] = api_configurations_list.map(
    (api_configuration) => ({
      ...api_configuration,
      id: get_api_configuration_id(api_configuration)
    })
  )

  panel_view_provider.send_message({
    command: 'API_CONFIGURATIONS',
    configurations
  })
}
