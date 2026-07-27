import { ApiManagerViewProvider } from '../api-manager-view-provider'

export const handle_get_chats = (
  api_manager_view_provider: ApiManagerViewProvider
) => {
  api_manager_view_provider.send_message({
    command: 'CHATS',
    chats: api_manager_view_provider.chats
  })
}
