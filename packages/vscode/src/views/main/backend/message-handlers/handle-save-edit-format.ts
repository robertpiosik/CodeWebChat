import { MainViewProvider } from '@/views/main/backend/view-provider'
import { EditFormat } from '@shared/types/edit-format'

export const handle_save_edit_format = async (
  provider: MainViewProvider,
  edit_format: EditFormat
): Promise<void> => {
  provider.edit_format = edit_format
  await provider.context.workspaceState.update('editFormat', edit_format)
}
