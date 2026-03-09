import { MODE } from '../../types/main-view-mode'
import { PanelProvider } from '../panel-provider'
import { API_MODE_STATE_KEY, WEB_MODE_STATE_KEY } from '@/constants/state-keys'

export const handle_return_home_and_switch_to_edit_context = async (
  panel_provider: PanelProvider
) => {
  panel_provider.send_message({ command: 'RETURN_HOME' })
  if (panel_provider.mode == MODE.WEB) {
    panel_provider.web_prompt_type = 'edit-context'
    await panel_provider.context.workspaceState.update(
      WEB_MODE_STATE_KEY,
      'edit-context'
    )
    panel_provider.send_message({
      command: 'WEB_PROMPT_TYPE',
      prompt_type: 'edit-context'
    })
  } else {
    panel_provider.api_prompt_type = 'edit-context'
    await panel_provider.context.workspaceState.update(
      API_MODE_STATE_KEY,
      'edit-context'
    )
    panel_provider.send_message({
      command: 'API_PROMPT_TYPE',
      prompt_type: 'edit-context'
    })
  }
  panel_provider.update_providers_shrink_mode()
  panel_provider.update_providers_context_state()
}
