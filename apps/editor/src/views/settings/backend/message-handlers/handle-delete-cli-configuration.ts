import { remove } from '@/views/shared/actions/agent/delete'

export const handle_delete_cli_configuration = async (
  name: string
): Promise<void> => {
  await remove({ name })
}