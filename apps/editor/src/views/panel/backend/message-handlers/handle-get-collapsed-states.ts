import {
  API_CONFIGURATIONS_COLLAPSED_STATE_KEY,
  WEB_CONFIGURATIONS_COLLAPSED_STATE_KEY
} from '@/constants/state-keys'
import { PanelProvider } from '@/views/panel/backend/panel-provider'

export const handle_get_collapsed_states = (panel_provider: PanelProvider) => {
  panel_provider.send_message({
    command: 'COLLAPSED_STATES',
    web_configurations_collapsed: panel_provider.context.globalState.get<boolean>(
      WEB_CONFIGURATIONS_COLLAPSED_STATE_KEY,
      false
    ),
    api_configurations_collapsed: panel_provider.context.globalState.get<boolean>(
      API_CONFIGURATIONS_COLLAPSED_STATE_KEY,
      false
    )
  })
}

