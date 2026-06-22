import { DeleteWebConfigurationMessage } from '@/views/panel/types/messages'
import { delete_web_configuration } from '@/views/utils/delete-web-configuration'

export const handle_delete_web_configuration = async (
  message: DeleteWebConfigurationMessage
): Promise<void> => {
  await delete_web_configuration({ name: message.name })
}
