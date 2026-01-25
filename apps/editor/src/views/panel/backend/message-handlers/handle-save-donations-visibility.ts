import { RECENT_DONATIONS_VISIBLE_STATE_KEY } from '@/constants/state-keys'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { SaveDonationsVisibilityMessage } from '@/views/panel/types/messages'

export const handle_save_donations_visibility = async (
  panel_provider: PanelProvider,
  message: SaveDonationsVisibilityMessage
): Promise<void> => {
  await panel_provider.context.globalState.update(
    RECENT_DONATIONS_VISIBLE_STATE_KEY,
    message.is_visible
  )
}
