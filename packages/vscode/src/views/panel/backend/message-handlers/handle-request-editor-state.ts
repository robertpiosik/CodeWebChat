import { PanelProvider } from '@/views/panel/backend/panel-provider'

export const handle_request_editor_state = (
  panel_provider: PanelProvider
): void => {
  panel_provider.send_message({
    command: 'EDITOR_STATE_CHANGED',
    has_active_editor: panel_provider.has_active_editor
  })
}
