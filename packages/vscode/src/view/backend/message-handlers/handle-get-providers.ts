import { ViewProvider } from '@/view/backend/view-provider'
import { ExtensionMessage } from '@/view/types/messages'
import { SAVED_PROVIDERS_STATE_KEY } from '@/constants/state-keys'

export const handle_get_providers = (provider: ViewProvider): void => {
  const providers = provider.context.globalState.get(
    SAVED_PROVIDERS_STATE_KEY,
    []
  )
  provider.send_message<ExtensionMessage>({
    command: 'PROVIDERS',
    providers
  })
}
