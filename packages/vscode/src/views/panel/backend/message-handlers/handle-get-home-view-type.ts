import { PanelProvider } from '@/views/panel/backend/panel-provider'

export const handle_get_home_view_type = (provider: PanelProvider): void => {
  provider.send_message({
    command: 'HOME_VIEW_TYPE',
    view_type: provider.home_view_type
  })
}
