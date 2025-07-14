import { ViewProvider } from '@/view/backend/view-provider'
import { ExtensionMessage } from '@/view/types/messages'

export const handle_get_version = (provider: ViewProvider): void => {
  provider.send_message<ExtensionMessage>({
    command: 'VERSION',
    version: provider.context.extension.packageJSON.version
  })
}
