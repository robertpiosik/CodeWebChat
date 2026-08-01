import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'

export const handle_get_connection_status = (
  prompt_view_provider: PromptViewProvider
) => {
  prompt_view_provider.send_message({
    command: 'CONNECTION_STATUS',
    connected:
      prompt_view_provider.websocket_server_instance.is_connected_with_browser()
  })
}
