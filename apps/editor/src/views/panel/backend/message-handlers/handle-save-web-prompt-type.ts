import { PanelViewProvider } from '@/views/panel/backend/panel-view-provider'
import { WebPromptType } from '@shared/types/prompt-types'

export const handle_save_web_prompt_type = async (
  panel_view_provider: PanelViewProvider,
  prompt_type: WebPromptType
): Promise<void> => {
  panel_view_provider.web_prompt_type = prompt_type
  await panel_view_provider.extension_context.workspaceState.update(
    'web-mode',
    prompt_type
  )
}
