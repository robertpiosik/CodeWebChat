import { DeleteWebConfigurationMessage } from '@/views/panel/types/messages'
import { remove } from '@/views/shared/actions/web/delete'

export const handle_delete_web_configuration = async (
  message: DeleteWebConfigurationMessage
): Promise<void> => {
  await remove({ name: message.name })
}
