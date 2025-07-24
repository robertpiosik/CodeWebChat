import { ViewProvider } from '@/view/backend/view-provider'
import { BackendMessage } from '@/view/types/messages'

export const handle_get_version = (provider: ViewProvider): void => {
  provider.send_message({
    command: 'VERSION',
    version: provider.context.extension.packageJSON.version
  })
}
