import {
  API_EDIT_FORMAT_STATE_KEY,
  CHAT_EDIT_FORMAT_STATE_KEY
} from '@/constants/state-keys'
import { ViewProvider } from '@/views/panel/backend/panel-provider'
import { SaveEditFormatMessage } from '@/views/panel/types/messages'

export const handle_save_edit_format = async (
  provider: ViewProvider,
  message: SaveEditFormatMessage
): Promise<void> => {
  if (message.target == 'chat') {
    provider.chat_edit_format = message.edit_format
    await provider.context.workspaceState.update(
      CHAT_EDIT_FORMAT_STATE_KEY,
      message.edit_format
    )
    await provider.context.globalState.update(
      CHAT_EDIT_FORMAT_STATE_KEY,
      message.edit_format
    )
  } else if (message.target == 'api') {
    provider.api_edit_format = message.edit_format
    await provider.context.workspaceState.update(
      API_EDIT_FORMAT_STATE_KEY,
      message.edit_format
    )
    await provider.context.globalState.update(
      API_EDIT_FORMAT_STATE_KEY,
      message.edit_format
    )
  }
}
