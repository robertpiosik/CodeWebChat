import { PanelViewProvider } from '@/views/panel/backend/panel-view-provider'
import { ApiPromptType } from '@shared/types/prompt-types'

export const handle_save_api_prompt_type = async (
  panel_view_provider: PanelViewProvider,
  prompt_type: ApiPromptType
): Promise<void> => {
  panel_view_provider.api_prompt_type = prompt_type
  await panel_view_provider.extension_context.workspaceState.update(
    'api-mode',
    prompt_type
  )
}
