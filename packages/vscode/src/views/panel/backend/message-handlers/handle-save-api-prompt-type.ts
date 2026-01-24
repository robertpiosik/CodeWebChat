import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { ApiPromptType } from '@shared/types/prompt-types'

export const handle_save_api_prompt_type = async (
  panel_provider: PanelProvider,
  prompt_type: ApiPromptType
): Promise<void> => {
  panel_provider.api_prompt_type = prompt_type
  await panel_provider.context.workspaceState.update('api-mode', prompt_type)
}
