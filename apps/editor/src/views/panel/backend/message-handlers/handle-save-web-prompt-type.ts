import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { WebPromptType } from '@shared/types/prompt-types'

export const handle_save_web_prompt_type = async (
  panel_provider: PanelProvider,
  prompt_type: WebPromptType
): Promise<void> => {
  panel_provider.web_prompt_type = prompt_type
  await panel_provider.context.workspaceState.update('web-mode', prompt_type)
}
