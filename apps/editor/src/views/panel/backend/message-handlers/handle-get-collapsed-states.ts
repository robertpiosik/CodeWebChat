import {
  ARE_TASKS_COLLAPSED_STATE_KEY,
  get_configurations_collapsed_state_key,
  get_presets_collapsed_state_key,
  IS_TIMELINE_COLLAPSED_STATE_KEY
} from '@/constants/state-keys'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { ApiPromptType, WebPromptType } from '@shared/types/prompt-types'

export const handle_get_collapsed_states = (panel_provider: PanelProvider) => {
  const WEB_PROMPT_TYPES: WebPromptType[] = [
    'ask-about-context',
    'edit-context',
    'code-at-cursor',
    'no-context'
  ]
  const API_PROMPT_TYPES: ApiPromptType[] = ['edit-context', 'code-at-cursor']

  panel_provider.send_message({
    command: 'COLLAPSED_STATES',
    presets_collapsed_by_web_mode: Object.fromEntries(
      WEB_PROMPT_TYPES.map((mode) => [
        mode,
        panel_provider.context.globalState.get<boolean>(
          get_presets_collapsed_state_key(mode),
          false
        )
      ])
    ),
    configurations_collapsed_by_api_mode: Object.fromEntries(
      API_PROMPT_TYPES.map((mode) => [
        mode,
        panel_provider.context.globalState.get<boolean>(
          get_configurations_collapsed_state_key(mode),
          false
        )
      ])
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
