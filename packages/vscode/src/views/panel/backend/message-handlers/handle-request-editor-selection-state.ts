import { PanelProvider } from '@/views/panel/backend/panel-provider'

export const handle_request_editor_selection_state = (
  panel_provider: PanelProvider
): void => {
  panel_provider.send_message({
    command: 'EDITOR_SELECTION_CHANGED',
    has_selection: panel_provider.has_active_selection
  })
}
