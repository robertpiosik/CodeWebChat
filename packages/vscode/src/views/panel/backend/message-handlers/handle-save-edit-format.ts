import {
  API_EDIT_FORMAT_STATE_KEY,
  CHAT_EDIT_FORMAT_STATE_KEY
} from '@/constants/state-keys'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { SaveEditFormatMessage } from '@/views/panel/types/messages'

export const handle_save_edit_format = async (
  panel_provider: PanelProvider,
  message: SaveEditFormatMessage
): Promise<void> => {
  if (message.target == 'chat') {
    panel_provider.chat_edit_format = message.edit_format
    await panel_provider.context.workspaceState.update(
      CHAT_EDIT_FORMAT_STATE_KEY,
      message.edit_format
    )
    await panel_provider.context.globalState.update(
      CHAT_EDIT_FORMAT_STATE_KEY,
      message.edit_format
    )
  } else if (message.target == 'api') {
    panel_provider.api_edit_format = message.edit_format
    await panel_provider.context.workspaceState.update(
      API_EDIT_FORMAT_STATE_KEY,
      message.edit_format
    )
    await panel_provider.context.globalState.update(
      API_EDIT_FORMAT_STATE_KEY,
      message.edit_format
    )
  }
}
