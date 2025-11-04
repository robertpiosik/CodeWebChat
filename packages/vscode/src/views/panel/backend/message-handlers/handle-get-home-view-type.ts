import { PanelProvider } from '@/views/panel/backend/panel-provider'

export const handle_get_home_view_type = (
  panel_provider: PanelProvider
): void => {
  panel_provider.send_message({
    command: 'HOME_VIEW_TYPE',
    view_type: panel_provider.home_view_type
  })
}
