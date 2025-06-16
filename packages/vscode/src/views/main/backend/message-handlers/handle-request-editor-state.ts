import { MainViewProvider } from '@/views/main/backend/view-provider'
import { ExtensionMessage } from '@/views/main/types/messages'

export const handle_request_editor_state = (provider: MainViewProvider): void => {
  provider.send_message<ExtensionMessage>({
    command: 'EDITOR_STATE_CHANGED',
    has_active_editor: provider.has_active_editor
  })
}
