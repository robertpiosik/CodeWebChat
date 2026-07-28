import { CHATS_VIEW_CHAT_HISTORY_STATE_KEY } from '@/constants/state-keys'
import { ChatsViewProvider } from '../chats-view-provider'
import { DeleteChatMessage } from '../../types/messages'

export const handle_delete_chat = (
  chats_view_provider: ChatsViewProvider,
  message: DeleteChatMessage
) => {
  chats_view_provider.chats = chats_view_provider.chats.filter(
    (c) => c.timestamp != message.timestamp
  )
  chats_view_provider.extension_context.workspaceState.update(
    CHATS_VIEW_CHAT_HISTORY_STATE_KEY,
    chats_view_provider.chats
  )
  chats_view_provider.send_message({
    command: 'CHATS',
    chats: chats_view_provider.chats
  })
}
