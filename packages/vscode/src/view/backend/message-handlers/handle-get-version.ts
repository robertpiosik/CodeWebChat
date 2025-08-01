import { ViewProvider } from '@/view/backend/view-provider'

export const handle_get_version = (provider: ViewProvider): void => {
  provider.send_message({
    command: 'VERSION',
    version: provider.context.extension.packageJSON.version
  })
}
