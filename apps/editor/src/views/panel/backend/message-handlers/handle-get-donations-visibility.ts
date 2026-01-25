import { RECENT_DONATIONS_VISIBLE_STATE_KEY } from '@/constants/state-keys'
import { PanelProvider } from '@/views/panel/backend/panel-provider'

export const handle_get_donations_visibility = (
  panel_provider: PanelProvider
): void => {
  const is_visible = panel_provider.context.globalState.get<boolean>(
    RECENT_DONATIONS_VISIBLE_STATE_KEY,
    false
  )
  panel_provider.send_message({
    command: 'DONATIONS_VISIBILITY',
    is_visible
  })
}
