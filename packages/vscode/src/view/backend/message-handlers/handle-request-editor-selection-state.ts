import { ViewProvider } from '@/view/backend/view-provider'

export const handle_request_editor_selection_state = (
  provider: ViewProvider
): void => {
  provider.send_message({
    command: 'EDITOR_SELECTION_CHANGED',
    has_selection: provider.has_active_selection
  })
}
