import { PanelViewProvider } from '@/views/panel/backend/panel-view-provider'
import { ModeChangedMessage } from '@/views/panel/types/messages'

export const handle_mode_changed = (
  panel_view_provider: PanelViewProvider,
  message: ModeChangedMessage
): void => {
  panel_view_provider.mode = message.mode
}
