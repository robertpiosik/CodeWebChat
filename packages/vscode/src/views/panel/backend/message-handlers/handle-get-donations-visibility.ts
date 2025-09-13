import { RECENT_DONATIONS_VISIBLE_STATE_KEY } from '@/constants/state-keys'
import { ViewProvider } from '@/views/panel/backend/view-provider'

export const handle_get_donations_visibility = (
  provider: ViewProvider
): void => {
  const is_visible = provider.context.globalState.get<boolean>(
    RECENT_DONATIONS_VISIBLE_STATE_KEY,
    false
  )
  provider.send_message({
    command: 'DONATIONS_VISIBILITY',
    is_visible
  })
}
