import { PanelProvider } from '@/views/panel/backend/panel-provider'

export const handle_request_editor_state = (
  panel_provider: PanelProvider
): void => {
  panel_provider.send_message({
    command: 'EDITOR_STATE_CHANGED',
    currently_open_file_path: panel_provider.currently_open_file_path
  })
}
