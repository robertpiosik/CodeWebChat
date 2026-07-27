import { MODE } from '../../types/main-view-mode'
import { PanelViewProvider } from '../panel-view-provider'
import { API_MODE_STATE_KEY, WEB_MODE_STATE_KEY } from '@/constants/state-keys'

export const handle_return_home_and_switch_to_edit_files = async (
  panel_view_provider: PanelViewProvider
) => {
  panel_view_provider.send_message({ command: 'RETURN_HOME' })
  if (panel_view_provider.mode == MODE.WEB) {
    panel_view_provider.web_prompt_type = 'edit-files'
    await panel_view_provider.extension_context.workspaceState.update(
      WEB_MODE_STATE_KEY,
      'edit-files'
    )
    panel_view_provider.send_message({
      command: 'WEB_PROMPT_TYPE',
      prompt_type: 'edit-files'
    })
  } else {
    panel_view_provider.api_prompt_type = 'edit-files'
    await panel_view_provider.extension_context.workspaceState.update(
      API_MODE_STATE_KEY,
      'edit-files'
    )
    panel_view_provider.send_message({
      command: 'API_PROMPT_TYPE',
      prompt_type: 'edit-files'
    })
  }
  panel_view_provider.update_providers_shrink_mode()
  panel_view_provider.update_providers_context_state()
}
