import { ViewProvider } from '@/view/backend/view-provider'

export const handle_get_home_view_type = (
  provider: ViewProvider
): void => {
  provider.send_message({
    command: 'HOME_VIEW_TYPE',
    view_type: provider.home_view_type
  })
}
