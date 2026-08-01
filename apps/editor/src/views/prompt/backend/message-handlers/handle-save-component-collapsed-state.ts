import {
  API_CONFIGURATIONS_COLLAPSED_STATE_KEY,
  WEB_CONFIGURATIONS_COLLAPSED_STATE_KEY
} from '@/constants/state-keys'
import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'
import { SaveComponentCollapsedStateMessage } from '@/views/prompt/types/messages'

export const handle_save_component_collapsed_state = async (
  prompt_view_provider: PromptViewProvider,
  message: SaveComponentCollapsedStateMessage
): Promise<void> => {
  if (message.component == 'web-configurations') {
    await prompt_view_provider.extension_context.globalState.update(
      WEB_CONFIGURATIONS_COLLAPSED_STATE_KEY,
      message.is_collapsed
    )
  } else if (message.component == 'api-configurations') {
    await prompt_view_provider.extension_context.globalState.update(
      API_CONFIGURATIONS_COLLAPSED_STATE_KEY,
      message.is_collapsed
    )
  }
}
