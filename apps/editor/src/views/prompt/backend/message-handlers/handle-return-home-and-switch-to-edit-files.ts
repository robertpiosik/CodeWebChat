import { MODE } from '../../types/main-view-mode'
import { PromptViewProvider } from '../prompt-view-provider'
import { API_MODE_STATE_KEY, WEB_MODE_STATE_KEY } from '@/constants/state-keys'

export const handle_return_home_and_switch_to_edit_files = async (
  prompt_view_provider: PromptViewProvider
) => {
  prompt_view_provider.send_message({ command: 'RETURN_HOME' })
  if (prompt_view_provider.mode == MODE.WEB) {
    prompt_view_provider.web_prompt_type = 'edit-files'
    await prompt_view_provider.extension_context.workspaceState.update(
      WEB_MODE_STATE_KEY,
      'edit-files'
    )
    prompt_view_provider.send_message({
      command: 'WEB_PROMPT_TYPE',
      prompt_type: 'edit-files'
    })
  } else {
    prompt_view_provider.api_prompt_type = 'edit-files'
    await prompt_view_provider.extension_context.workspaceState.update(
      API_MODE_STATE_KEY,
      'edit-files'
    )
    prompt_view_provider.send_message({
      command: 'API_PROMPT_TYPE',
      prompt_type: 'edit-files'
    })
  }
  prompt_view_provider.update_providers_shrink_mode()
  prompt_view_provider.update_providers_context_state()
}
