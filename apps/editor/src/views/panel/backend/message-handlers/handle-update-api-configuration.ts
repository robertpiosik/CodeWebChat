import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { UpdateApiConfigurationMessage } from '@/views/panel/types/messages'
import { update_api_configuration } from '@/views/actions/update-api-configuration'
import { handle_get_api_configurations } from './handle-get-api-configurations'

export const handle_update_api_configuration = async (
  panel_provider: PanelProvider,
  message: UpdateApiConfigurationMessage
): Promise<void> => {
  const result = await update_api_configuration({
    context: panel_provider.context,
    updating_api_configuration: message.updating_api_configuration,
    updated_api_configuration: message.updated_api_configuration,
    origin: message.origin
  })

  if (result.has_changes && result.new_id) {
    panel_provider.send_message({
      command: 'SELECTED_API_CONFIGURATION_CHANGED',
      prompt_type: panel_provider.api_prompt_type,
      id: result.new_id
    })
  }

  if (result.success) {
    panel_provider.send_message({
      command: 'API_CONFIGURATION_UPDATED'
    })

    await handle_get_api_configurations(panel_provider)
  }
}
