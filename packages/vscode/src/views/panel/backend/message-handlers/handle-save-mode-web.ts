import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { WebPromptType } from '@shared/types/prompt-types'

export const handle_save_mode_web = async (
  panel_provider: PanelProvider,
  mode: WebPromptType
): Promise<void> => {
  panel_provider.web_prompt_type = mode
  await panel_provider.context.workspaceState.update('web-mode', mode)
}
