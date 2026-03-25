import {
  ARE_TASKS_COLLAPSED_STATE_KEY,
  CONFIGURATIONS_COLLAPSED_STATE_KEY,
  PRESETS_COLLAPSED_STATE_KEY,
  IS_TIMELINE_COLLAPSED_STATE_KEY
} from '@/constants/state-keys'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { SaveComponentCollapsedStateMessage } from '@/views/panel/types/messages'

export const handle_save_component_collapsed_state = async (
  panel_provider: PanelProvider,
  message: SaveComponentCollapsedStateMessage
): Promise<void> => {
  if (message.component == 'presets') {
    await panel_provider.context.globalState.update(
      PRESETS_COLLAPSED_STATE_KEY,
      message.is_collapsed
    )
  } else if (message.component == 'configurations') {
    await panel_provider.context.globalState.update(
      CONFIGURATIONS_COLLAPSED_STATE_KEY,
      message.is_collapsed
    )
  } else if (message.component == 'timeline') {
    await panel_provider.context.workspaceState.update(
      IS_TIMELINE_COLLAPSED_STATE_KEY,
      message.is_collapsed
    )
  } else if (message.component == 'tasks') {
    await panel_provider.context.workspaceState.update(
      ARE_TASKS_COLLAPSED_STATE_KEY,
      message.is_collapsed
    )
  }
}
