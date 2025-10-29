import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { WebMode } from '@shared/types/modes'

export const handle_save_mode_web = async (
  provider: PanelProvider,
  mode: WebMode
): Promise<void> => {
  provider.web_mode = mode
  await provider.context.workspaceState.update('web-mode', mode)
}
