import { DuplicateWebConfigurationMessage } from '@/views/settings/types/messages'
import { duplicate_web_configuration } from '@/views/actions/duplicate-web-configuration'

export const handle_duplicate_web_configuration = async (
  message: DuplicateWebConfigurationMessage
): Promise<void> => {
  await duplicate_web_configuration({ name: message.name })
}
