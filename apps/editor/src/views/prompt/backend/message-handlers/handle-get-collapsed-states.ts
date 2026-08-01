import {
  API_CONFIGURATIONS_COLLAPSED_STATE_KEY,
  WEB_CONFIGURATIONS_COLLAPSED_STATE_KEY
} from '@/constants/state-keys'
import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'

export const handle_get_collapsed_states = (
  prompt_view_provider: PromptViewProvider
) => {
  prompt_view_provider.send_message({
    command: 'COLLAPSED_STATES',
    web_configurations_collapsed:
      prompt_view_provider.extension_context.globalState.get<boolean>(
        WEB_CONFIGURATIONS_COLLAPSED_STATE_KEY,
        false
      ),
    api_configurations_collapsed:
      prompt_view_provider.extension_context.globalState.get<boolean>(
        API_CONFIGURATIONS_COLLAPSED_STATE_KEY,
        false
      )
  })
}
