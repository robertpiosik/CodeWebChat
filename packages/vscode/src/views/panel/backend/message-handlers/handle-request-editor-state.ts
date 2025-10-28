import { PanelProvider } from '@/views/panel/backend/panel-provider'

export const handle_request_editor_state = (provider: PanelProvider): void => {
  provider.send_message({
    command: 'EDITOR_STATE_CHANGED',
    has_active_editor: provider.has_active_editor
  })
}
