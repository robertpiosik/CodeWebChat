import { PanelViewProvider } from '@/views/panel/backend/panel-view-provider'

export const handle_get_edit_format = (
  panel_view_provider: PanelViewProvider
) => {
  panel_view_provider.send_message({
    command: 'EDIT_FORMAT',
    edit_format: panel_view_provider.edit_format
  })
}
