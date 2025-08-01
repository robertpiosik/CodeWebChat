import { ViewProvider } from '@/view/backend/view-provider'
import { SaveEditFormatMessage } from '@/view/types/messages'

export const handle_save_edit_format = async (
  provider: ViewProvider,
  message: SaveEditFormatMessage
): Promise<void> => {
  if (message.target == 'chat') {
    provider.chat_edit_format = message.edit_format
    await provider.context.workspaceState.update(
      'chat-edit-format',
      message.edit_format
    )
  } else if (message.target == 'api') {
    provider.api_edit_format = message.edit_format
    await provider.context.workspaceState.update(
      'api-edit-format',
      message.edit_format
    )
  }
}
