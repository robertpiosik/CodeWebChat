import { ViewProvider } from '@/view/backend/view-provider'
import { SaveProvidersMessage } from '@/view/types/messages'
import { SAVED_PROVIDERS_STATE_KEY } from '@/constants/state-keys'

export const handle_save_providers = async (
  provider: ViewProvider,
  message: SaveProvidersMessage
): Promise<void> => {
  await provider.context.globalState.update(
    SAVED_PROVIDERS_STATE_KEY,
    message.providers
  )
}
