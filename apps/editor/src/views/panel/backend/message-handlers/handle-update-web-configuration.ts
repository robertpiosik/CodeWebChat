import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { UpdateWebConfigurationMessage } from '@/views/panel/types/messages'
import { update_web_configuration } from '@/views/actions/update-web-configuration'

export const handle_update_web_configuration = async (
  panel_provider: PanelProvider,
  message: UpdateWebConfigurationMessage
): Promise<void> => {
  const result = await update_web_configuration({
    updating_web_configuration: message.updating_web_configuration,
    updated_web_configuration: message.updated_web_configuration,
    origin: message.origin
  })

  if (result.has_changes && result.new_name) {
    panel_provider.send_message({
      command: 'SELECTED_WEB_CONFIGURATION_CHANGED',
      prompt_type: panel_provider.web_prompt_type,
      name: result.new_name
    })
  }

  if (result.success) {
    panel_provider.send_message({
      command: 'WEB_CONFIGURATION_UPDATED'
    })
  }
}
