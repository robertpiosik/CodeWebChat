import { remove } from '@/views/actions/web/delete'

export const handle_delete_web_configuration = async (
  name: string
): Promise<void> => {
  await remove({ name })
}
