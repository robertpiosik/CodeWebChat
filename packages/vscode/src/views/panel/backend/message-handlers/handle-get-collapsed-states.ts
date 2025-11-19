import {
  get_configurations_collapsed_state_key,
  get_presets_collapsed_state_key
} from '@/constants/state-keys'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { ApiPromptType, WebPromptType } from '@shared/types/prompt-types'

export const handle_get_collapsed_states = (
  panel_provider: PanelProvider
): void => {
  const WEB_MODES: WebPromptType[] = [
    'ask',
    'edit-context',
    'code-completions',
    'no-context'
  ]
  const API_MODES: ApiPromptType[] = ['edit-context', 'code-completions']
  panel_provider.send_message({
    command: 'COLLAPSED_STATES',
    presets_collapsed_by_web_mode: Object.fromEntries(
      WEB_MODES.map((mode) => [
        mode,
        panel_provider.context.globalState.get<boolean>(
          get_presets_collapsed_state_key(mode),
          false
        )
      ])
    ),
    configurations_collapsed_by_api_mode: Object.fromEntries(
      API_MODES.map((mode) => [
        mode,
        panel_provider.context.globalState.get<boolean>(
          get_configurations_collapsed_state_key(mode),
          false
        )
      ])
    )
  })
}
