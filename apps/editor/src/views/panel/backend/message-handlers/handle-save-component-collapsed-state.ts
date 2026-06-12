import {
  API_CONFIGURATIONS_COLLAPSED_STATE_KEY,
  WEB_CONFIGURATIONS_COLLAPSED_STATE_KEY
} from '@/constants/state-keys'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { SaveComponentCollapsedStateMessage } from '@/views/panel/types/messages'

export const handle_save_component_collapsed_state = async (
  panel_provider: PanelProvider,
  message: SaveComponentCollapsedStateMessage
): Promise<void> => {
  if (message.component == 'web-configurations') {
    await panel_provider.context.globalState.update(
      WEB_CONFIGURATIONS_COLLAPSED_STATE_KEY,
      message.is_collapsed
    )
  } else if (message.component == 'api-configurations') {
    await panel_provider.context.globalState.update(
      API_CONFIGURATIONS_COLLAPSED_STATE_KEY,
      message.is_collapsed
    )
  }
}

