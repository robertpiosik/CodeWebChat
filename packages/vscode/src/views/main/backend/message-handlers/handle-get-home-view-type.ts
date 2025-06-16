import { MainViewProvider } from '@/views/main/backend/view-provider'
import { ExtensionMessage } from '@/views/main/types/messages'

export const handle_get_home_view_type = (
  provider: MainViewProvider
): void => {
  provider.send_message<ExtensionMessage>({
    command: 'HOME_VIEW_TYPE',
    view_type: provider.home_view_type
  })
}
