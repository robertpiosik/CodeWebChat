import { ViewProvider } from '@/view/backend/view-provider'
import { BackendMessage } from '@/view/types/messages'

export const handle_request_editor_state = (provider: ViewProvider): void => {
  provider.send_message({
    command: 'EDITOR_STATE_CHANGED',
    has_active_editor: provider.has_active_editor
  })
}
