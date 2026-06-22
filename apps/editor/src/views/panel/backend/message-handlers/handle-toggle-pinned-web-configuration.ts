import { TogglePinnedWebConfigurationMessage } from '@/views/panel/types/messages'
import { toggle_pinned_web_configuration } from '@/views/actions/toggle-pinned-web-configuration'

export const handle_toggle_pinned_web_configuration = async (
  message: TogglePinnedWebConfigurationMessage
): Promise<void> => {
  await toggle_pinned_web_configuration({
    web_configuration_name: message.web_configuration_name
  })
}