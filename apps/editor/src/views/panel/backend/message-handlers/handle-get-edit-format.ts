import { PanelProvider } from '@/views/panel/backend/panel-provider'

export const handle_get_edit_format = (panel_provider: PanelProvider): void => {
  panel_provider.send_message({
    command: 'EDIT_FORMAT',
    chat_edit_format: panel_provider.chat_edit_format,
    api_edit_format: panel_provider.api_edit_format
  })
}
