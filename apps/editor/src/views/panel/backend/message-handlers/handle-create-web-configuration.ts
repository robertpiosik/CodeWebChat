import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { CreateWebConfigurationMessage } from '@/views/panel/types/messages'
import { create_web_configuration } from '@/views/utils/create-web-configuration'

export const handle_create_web_configuration = async (
  panel_provider: PanelProvider,
  message: CreateWebConfigurationMessage
): Promise<void> => {
  const new_config = await create_web_configuration(message)

  if (new_config && new_config.name) {
    panel_provider.send_message({
      command: 'SELECTED_WEB_CONFIGURATION_CHANGED',
      prompt_type: panel_provider.web_prompt_type,
      name: new_config.name
    })
  }

  panel_provider.send_message({
    command: 'WEB_CONFIGURATION_UPDATED'
  })
}
