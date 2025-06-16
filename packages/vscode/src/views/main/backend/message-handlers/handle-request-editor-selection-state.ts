import { MainViewProvider } from '@/views/main/backend/view-provider'
import { ExtensionMessage } from '@/views/main/types/messages'

export const handle_request_editor_selection_state = (
  provider: MainViewProvider
): void => {
  provider.send_message<ExtensionMessage>({
    command: 'EDITOR_SELECTION_CHANGED',
    has_selection: provider.has_active_selection
  })
}
