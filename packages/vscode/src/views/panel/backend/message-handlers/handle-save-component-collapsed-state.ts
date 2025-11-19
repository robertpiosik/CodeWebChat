import {
  get_configurations_collapsed_state_key,
  get_presets_collapsed_state_key
} from '@/constants/state-keys'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { SaveComponentCollapsedStateMessage } from '@/views/panel/types/messages'
import { ApiPromptType, WebPromptType } from '@shared/types/prompt-types'

export const handle_save_component_collapsed_state = async (
  panel_provider: PanelProvider,
  message: SaveComponentCollapsedStateMessage
): Promise<void> => {
  if (message.component == 'presets') {
    await panel_provider.context.globalState.update(
      get_presets_collapsed_state_key(message.mode as WebPromptType),
      message.is_collapsed
    )
  } else if (message.component == 'configurations') {
    await panel_provider.context.globalState.update(
      get_configurations_collapsed_state_key(message.mode as ApiPromptType),
      message.is_collapsed
    )
  }
}
