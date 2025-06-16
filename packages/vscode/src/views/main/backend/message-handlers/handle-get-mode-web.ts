import { MainViewProvider } from '@/views/main/backend/view-provider'
import { ExtensionMessage } from '@/views/main/types/messages'

export const handle_get_mode_web = (provider: MainViewProvider): void => {
  provider.send_message<ExtensionMessage>({
    command: 'WEB_MODE',
    mode: provider.web_mode
  })
}
