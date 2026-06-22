import { CreateWebConfigurationMessage } from '@/views/settings/types/messages'
import { create_web_configuration } from '@/views/actions/create-web-configuration'

export const handle_create_web_configuration = async (
  message: CreateWebConfigurationMessage
): Promise<void> => {
  if (!message.web_configuration_id) {
    await create_web_configuration({
      placement: message.create_on_top ? 'top' : 'bottom',
      reference_index: message.insertion_index
    })
  }
}
