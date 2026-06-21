import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { UpsertWebConfigurationMessage } from '@/views/panel/types/messages'
import { upsert_web_configuration } from '@/views/utils/upsert-web-configuration'

export const handle_upsert_web_configuration = async (
  panel_provider: PanelProvider,
  message: UpsertWebConfigurationMessage
): Promise<void> => {
  const new_config = await upsert_web_configuration(message)

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
