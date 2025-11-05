import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { WebMode } from '@shared/types/modes'

export const handle_save_mode_web = async (
  panel_provider: PanelProvider,
  mode: WebMode
): Promise<void> => {
  panel_provider.web_mode = mode
  await panel_provider.context.workspaceState.update('web-mode', mode)
}
