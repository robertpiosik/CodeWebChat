import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { ModeChangedMessage } from '@/views/panel/types/messages'

export const handle_mode_changed = (
  panel_provider: PanelProvider,
  message: ModeChangedMessage
): void => {
  panel_provider.mode = message.mode
}
