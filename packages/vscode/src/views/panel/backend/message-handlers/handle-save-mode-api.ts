import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { ApiMode } from '@shared/types/modes'

export const handle_save_mode_api = async (
  panel_provider: PanelProvider,
  mode: ApiMode
): Promise<void> => {
  panel_provider.api_mode = mode
  await panel_provider.context.workspaceState.update('api-mode', mode)
}
