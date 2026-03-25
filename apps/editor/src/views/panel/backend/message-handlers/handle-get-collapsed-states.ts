import {
  ARE_TASKS_COLLAPSED_STATE_KEY,
  CONFIGURATIONS_COLLAPSED_STATE_KEY,
  PRESETS_COLLAPSED_STATE_KEY,
  IS_TIMELINE_COLLAPSED_STATE_KEY
} from '@/constants/state-keys'
import { PanelProvider } from '@/views/panel/backend/panel-provider'

export const handle_get_collapsed_states = (panel_provider: PanelProvider) => {
  panel_provider.send_message({
    command: 'COLLAPSED_STATES',
    presets_collapsed: panel_provider.context.globalState.get<boolean>(
      PRESETS_COLLAPSED_STATE_KEY,
      false
    ),
    configurations_collapsed: panel_provider.context.globalState.get<boolean>(
      CONFIGURATIONS_COLLAPSED_STATE_KEY,
      false
    ),
    is_timeline_collapsed: panel_provider.context.workspaceState.get<boolean>(
      IS_TIMELINE_COLLAPSED_STATE_KEY,
      false
    ),
    are_tasks_collapsed: panel_provider.context.workspaceState.get<boolean>(
      ARE_TASKS_COLLAPSED_STATE_KEY,
      false
    )
  })
}
