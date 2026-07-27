import { API_MANAGER_VIEW_CHAT_HISTORY_STATE_KEY } from '@/constants/state-keys'
import { ApiManagerViewProvider } from '../api-manager-view-provider'
import { DeleteChatMessage } from '../../types/messages'

export const handle_delete_chat = (
  api_manager_view_provider: ApiManagerViewProvider,
  message: DeleteChatMessage
) => {
  api_manager_view_provider.chats = api_manager_view_provider.chats.filter(
    (c) => c.timestamp != message.timestamp
  )
  api_manager_view_provider.extension_context.workspaceState.update(
    API_MANAGER_VIEW_CHAT_HISTORY_STATE_KEY,
    api_manager_view_provider.chats
  )
  api_manager_view_provider.send_message({
    command: 'CHATS',
    chats: api_manager_view_provider.chats
  })
}
