import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { ApiPromptType } from '@shared/types/prompt-types'

export const handle_save_mode_api = async (
  panel_provider: PanelProvider,
  mode: ApiPromptType
): Promise<void> => {
  panel_provider.api_prompt_type = mode
  await panel_provider.context.workspaceState.update('api-mode', mode)
}
