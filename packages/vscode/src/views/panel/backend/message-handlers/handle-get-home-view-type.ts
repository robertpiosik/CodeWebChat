import { PanelProvider } from '@/views/panel/backend/panel-provider'

export const handle_get_main_view_type = (
  panel_provider: PanelProvider
): void => {
  panel_provider.send_message({
    command: 'MAIN_VIEW_TYPE',
    view_type: panel_provider.main_view_type
  })
}
