import { EDIT_FORMAT_STATE_KEY } from '@/constants/state-keys'
import { PanelViewProvider } from '@/views/panel/backend/panel-view-provider'
import { SaveEditFormatMessage } from '@/views/panel/types/messages'

export const handle_save_edit_format = async (
  panel_view_provider: PanelViewProvider,
  message: SaveEditFormatMessage
): Promise<void> => {
  panel_view_provider.edit_format = message.edit_format
  await panel_view_provider.extension_context.workspaceState.update(
    EDIT_FORMAT_STATE_KEY,
    message.edit_format
  )
  await panel_view_provider.extension_context.globalState.update(
    EDIT_FORMAT_STATE_KEY,
    message.edit_format
  )

  panel_view_provider.send_message({
    command: 'EDIT_FORMAT',
    edit_format: panel_view_provider.edit_format
  })
}
