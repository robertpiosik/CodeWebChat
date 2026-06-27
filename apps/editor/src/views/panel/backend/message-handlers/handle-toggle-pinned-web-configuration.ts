import { TogglePinnedWebConfigurationMessage } from '@/views/panel/types/messages'
import { toggle_pinned } from '@/views/actions/web/toggle-pinned'

export const handle_toggle_pinned_web_configuration = async (
  message: TogglePinnedWebConfigurationMessage
): Promise<void> => {
  await toggle_pinned({
    web_configuration_name: message.web_configuration_name
  })
}
