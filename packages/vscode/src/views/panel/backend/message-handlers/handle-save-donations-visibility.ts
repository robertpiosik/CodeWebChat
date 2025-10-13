import { RECENT_DONATIONS_VISIBLE_STATE_KEY } from '@/constants/state-keys'
import { ViewProvider } from '@/views/panel/backend/panel-provider'
import { SaveDonationsVisibilityMessage } from '@/views/panel/types/messages'

export const handle_save_donations_visibility = async (
  provider: ViewProvider,
  message: SaveDonationsVisibilityMessage
): Promise<void> => {
  await provider.context.globalState.update(
    RECENT_DONATIONS_VISIBLE_STATE_KEY,
    message.is_visible
  )
}
