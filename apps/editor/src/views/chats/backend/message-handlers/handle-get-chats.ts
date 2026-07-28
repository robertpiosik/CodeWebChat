import { ChatsViewProvider } from '../chats-view-provider'

export const handle_get_chats = (chats_view_provider: ChatsViewProvider) => {
  chats_view_provider.send_message({
    command: 'CHATS',
    chats: chats_view_provider.chats
  })
}
