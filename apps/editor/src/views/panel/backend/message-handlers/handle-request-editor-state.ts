import { PanelViewProvider } from '@/views/panel/backend/panel-view-provider'

export const handle_request_editor_state = (
  panel_view_provider: PanelViewProvider
) => {
  panel_view_provider.send_message({
    command: 'EDITOR_STATE_CHANGED',
    currently_open_file_path: panel_view_provider.currently_open_file_path
  })
}
