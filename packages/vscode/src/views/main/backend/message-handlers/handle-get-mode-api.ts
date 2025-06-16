import { MainViewProvider } from '@/views/main/backend/view-provider'
import { ExtensionMessage } from '@/views/main/types/messages'

export const handle_get_mode_api = (provider: MainViewProvider): void => {
  provider.send_message<ExtensionMessage>({
    command: 'API_MODE',
    mode: provider.api_mode
  })
}
