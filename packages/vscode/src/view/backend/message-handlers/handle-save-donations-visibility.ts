import { RECENT_DONATIONS_VISIBLE_STATE_KEY } from '@/constants/state-keys'
import { ViewProvider } from '@/view/backend/view-provider'
import { SaveDonationsVisibilityMessage } from '@/view/types/messages'

export const handle_save_donations_visibility = async (
  provider: ViewProvider,
  message: SaveDonationsVisibilityMessage
): Promise<void> => {
  await provider.context.workspaceState.update(
    RECENT_DONATIONS_VISIBLE_STATE_KEY,
    message.is_visible
  )
}
