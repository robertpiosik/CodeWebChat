import { ViewProvider } from '@/view/backend/view-provider'
import { BackendMessage } from '@/view/types/messages'

export const handle_get_mode_api = (provider: ViewProvider): void => {
  provider.send_message({
    command: 'API_MODE',
    mode: provider.api_mode
  })
}
