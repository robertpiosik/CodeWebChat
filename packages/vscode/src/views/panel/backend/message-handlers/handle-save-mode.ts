import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { SaveModeMessage } from '@/views/panel/types/messages'
import { PANEL_MODE_STATE_KEY } from '@/constants/state-keys'

export const handle_save_mode = async (
  panel_provider: PanelProvider,
  message: SaveModeMessage
): Promise<void> => {
  panel_provider.mode = message.mode
  await panel_provider.context.workspaceState.update(
    PANEL_MODE_STATE_KEY,
    message.mode
  )
  await panel_provider.context.globalState.update(
    PANEL_MODE_STATE_KEY,
    message.mode
  )
}
