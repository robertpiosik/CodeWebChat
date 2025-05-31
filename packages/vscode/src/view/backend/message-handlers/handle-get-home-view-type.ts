import { ViewProvider } from '@/view/backend/view-provider'
import { ExtensionMessage } from '@/view/types/messages'

export const handle_get_home_view_type = (
  provider: ViewProvider
): void => {
  provider.send_message<ExtensionMessage>({
    command: 'HOME_VIEW_TYPE',
    view_type: provider.home_view_type
  })
}
