import { delete_web_configuration } from '@/views/utils/delete-web-configuration'

export const handle_delete_web_configuration = async (
  name: string
): Promise<void> => {
  await delete_web_configuration({ name })
}
