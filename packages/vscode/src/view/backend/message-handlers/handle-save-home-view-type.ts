import { ViewProvider } from '@/view/backend/view-provider'
import { ExtensionMessage, SaveHomeViewTypeMessage } from '@/view/types/messages'

const HOME_VIEW_TYPE_STATE_KEY = 'homeViewType'

export const handle_save_home_view_type = async (
  provider: ViewProvider,
  message: SaveHomeViewTypeMessage
): Promise<void> => {
  provider.home_view_type = message.view_type
  await provider.context.workspaceState.update(
    HOME_VIEW_TYPE_STATE_KEY,
    message.view_type
  )
  provider.send_message<ExtensionMessage>({
    command: 'HOME_VIEW_TYPE',
    view_type: message.view_type
  })
}
