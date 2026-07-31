import {
  API_EDIT_FORMAT_STATE_KEY,
  CHAT_EDIT_FORMAT_STATE_KEY
} from '@/constants/state-keys'
import { PanelViewProvider } from '@/views/panel/backend/panel-view-provider'
import { SaveEditFormatMessage } from '@/views/panel/types/messages'

export const handle_save_edit_format = async (
  panel_view_provider: PanelViewProvider,
  message: SaveEditFormatMessage
): Promise<void> => {
  if (message.target == 'chat') {
    panel_view_provider.chat_edit_format = message.edit_format
    await panel_view_provider.extension_context.workspaceState.update(
      CHAT_EDIT_FORMAT_STATE_KEY,
      message.edit_format
    )
    await panel_view_provider.extension_context.globalState.update(
      CHAT_EDIT_FORMAT_STATE_KEY,
      message.edit_format
    )
  } else if (message.target == 'api') {
    panel_view_provider.api_edit_format = message.edit_format
    await panel_view_provider.extension_context.workspaceState.update(
      API_EDIT_FORMAT_STATE_KEY,
      message.edit_format
    )
    await panel_view_provider.extension_context.globalState.update(
      API_EDIT_FORMAT_STATE_KEY,
      message.edit_format
    )
  }

  panel_view_provider.send_message({
    command: 'EDIT_FORMAT',
    chat_edit_format: panel_view_provider.chat_edit_format,
    api_edit_format: panel_view_provider.api_edit_format
  })
}
