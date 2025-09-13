import { ViewProvider } from '@/views/panel/backend/view-provider'

export const handle_get_edit_format = (provider: ViewProvider): void => {
  provider.send_message({
    command: 'EDIT_FORMAT',
    chat_edit_format: provider.chat_edit_format,
    api_edit_format: provider.api_edit_format
  })
}
