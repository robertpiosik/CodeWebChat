import { PanelViewProvider } from '@/views/panel/backend/panel-view-provider'

export const handle_request_editor_selection_state = (
  panel_view_provider: PanelViewProvider
) => {
  panel_view_provider.send_message({
    command: 'EDITOR_SELECTION_CHANGED',
    current_selection: panel_view_provider.current_selection || null
  })
}
